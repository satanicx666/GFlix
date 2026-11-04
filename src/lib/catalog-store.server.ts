import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { MediaItem, MediaType } from "./tmdb.functions";

export async function readCatalogDetails(type: MediaType, id: number) {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) return null;
  const sb = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data } = await sb.from("media_catalog").select("metadata").eq("tmdb_id", id).eq("media_type", type).maybeSingle();
  return data?.metadata ?? null;
}

// Only provider responses reach this function, never browser-supplied metadata.
export async function persistTmdbCatalog(items: MediaItem[], details?: { type: MediaType; id: number; raw: Json }) {
  if (!items.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const unique = [...new Map(items.map((item) => [`${item.media_type}:${item.id}`, item])).values()];
  const rows = unique.map((item) => ({
    tmdb_id: item.id, media_type: item.media_type, title: item.title,
    overview: item.overview, poster_path: item.poster_path, backdrop_path: item.backdrop_path,
    vote_average: item.vote_average, release_date: item.date, updated_at: new Date().toISOString(),
  }));
  const { error } = await supabaseAdmin.from("media_catalog").upsert(rows, { onConflict: "tmdb_id,media_type" });
  if (error) throw new Error("Could not save the movie catalog");
  if (details) {
    const { error: detailError } = await supabaseAdmin.from("media_catalog").update({ metadata: details.raw })
      .eq("tmdb_id", details.id).eq("media_type", details.type);
    if (detailError) throw new Error("Could not save movie details");
  }
}