import { tmdb, type MediaType, type MediaItem } from "./tmdb.functions";
import { persistTmdbCatalog } from "./catalog-store.server";
import { changesWindow, exportFile, EXPORT_BATCH_SIZE, SYNC_BATCH_SIZE } from "./catalog-sync";

// Stream the official export; never buffer the complete decompressed catalog.
async function readExport(type: MediaType, date: string, offset: number) {
  const response = await fetch(`https://files.tmdb.org/p/exports/${exportFile(type, date)}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error(`TMDB export unavailable (${response.status})`);
  const reader = response.body.pipeThrough(new DecompressionStream("gzip")).pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "", seen = 0, done = false;
  const ids: number[] = [];
  try {
    while (ids.length < EXPORT_BATCH_SIZE) {
      const chunk = await reader.read();
      buffer += chunk.value ?? "";
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        if (seen++ < offset) continue;
        const row = JSON.parse(line) as { id: number };
        ids.push(row.id);
        if (ids.length === EXPORT_BATCH_SIZE) break;
      }
      if (chunk.done) { done = ids.length < EXPORT_BATCH_SIZE; break; }
    }
  } finally { await reader.cancel().catch(() => undefined); }
  return { ids, done };
}

export async function syncCatalog(type: MediaType, kind: "export" | "hydrate" | "changes") {
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  const { error: initError } = await sb.from("catalog_sync_jobs").upsert({ id: type }, { onConflict: "id", ignoreDuplicates: true });
  if (initError) throw initError;
  const { data: claimed, error: claimError } = await sb.rpc("claim_catalog_sync_job", { job_id: type });
  if (claimError) throw claimError;
  const job = claimed?.[0];
  if (!job) return { skipped: true };
  const today = new Date().toISOString().slice(0, 10);
  try {
    let count = 0;
    if (kind === "export") {
      // Yesterday's export is always available regardless of UTC run time.
      const yesterday = new Date(); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const date = job.export_date ?? yesterday.toISOString().slice(0, 10);
      if (!job.import_complete) {
        const batch = await readExport(type, date, job.export_offset);
        if (batch.ids.length) {
          const { error } = await sb.from("catalog_sync_queue").upsert(batch.ids.map(id => ({ media_type: type, tmdb_id: id })), { onConflict: "media_type,tmdb_id", ignoreDuplicates: true });
          if (error) throw error;
        }
        const { error } = await sb.from("catalog_sync_jobs").update({ export_date: date, export_offset: job.export_offset + batch.ids.length, import_complete: batch.done }).eq("id", type);
        if (error) throw error;
        count = batch.ids.length;
      }
    } else if (kind === "changes") {
      const window = changesWindow(job.changes_since, today);
      const result = await tmdb(`/${type}/changes`, { ...window, page: String(job.changes_page) }) as { results: { id: number }[]; total_pages: number };
      if (result.results.length) {
        const { error } = await sb.from("catalog_sync_queue").upsert(result.results.map(row => ({ media_type: type, tmdb_id: row.id, synced_at: null, attempts: 0 })), { onConflict: "media_type,tmdb_id" });
        if (error) throw error;
      }
      const finished = job.changes_page >= result.total_pages;
      const { error } = await sb.from("catalog_sync_jobs").update({ changes_page: finished ? 1 : job.changes_page + 1, changes_since: finished ? today : window.start_date }).eq("id", type);
      if (error) throw error;
      count = result.results.length;
    } else {
      const { data: pending, error } = await sb.from("catalog_sync_queue").select("tmdb_id,attempts").eq("media_type", type).is("synced_at", null).lt("attempts", 5).order("attempts").order("tmdb_id").limit(SYNC_BATCH_SIZE);
      if (error) throw error;
      const outcomes = await Promise.all((pending ?? []).map(async row => {
        try {
          const raw = await tmdb(`/${type}/${row.tmdb_id}`, { append_to_response: "videos,credits,similar" });
          const item: MediaItem = { id: raw.id, media_type: type, title: raw.title ?? raw.name ?? "Untitled", overview: raw.overview ?? "", poster_path: raw.poster_path ?? null, backdrop_path: raw.backdrop_path ?? null, vote_average: raw.vote_average ?? 0, date: raw.release_date ?? raw.first_air_date ?? null };
          return { row, raw, item, ok: true as const };
        } catch { return { row, ok: false as const }; }
      }));
      for (const outcome of outcomes) {
        if (outcome.ok) {
          await persistTmdbCatalog([outcome.item], { type, id: outcome.row.tmdb_id, raw: outcome.raw });
          count++;
        }
        const { error: updateError } = await sb.from("catalog_sync_queue").update({ synced_at: outcome.ok ? new Date().toISOString() : null, attempts: outcome.row.attempts + 1 }).eq("media_type", type).eq("tmdb_id", outcome.row.tmdb_id);
        if (updateError) throw updateError;
      }
    }
    const { error } = await sb.from("catalog_sync_jobs").update({ lock_until: null, last_error: null, last_success_at: new Date().toISOString(), updated_at: new Date().toISOString(), imported_count: job.imported_count + (kind === "hydrate" ? count : 0) }).eq("id", type);
    if (error) throw error;
    return { type, kind, processed: count };
  } catch (error) {
    await sb.from("catalog_sync_jobs").update({ lock_until: null, last_error: error instanceof Error ? error.message : "Sync failed" }).eq("id", type);
    throw error;
  }
}