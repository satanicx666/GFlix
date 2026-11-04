import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { publicClient } from "./public-client.server";
import { canWatch, canUseServer } from "./viewing";
import { DEFAULT_EMBED_TEMPLATES, embedPlaybackUrl, playbackInputSchema } from "@/lib/playback-url";
import { resolveSourceUrl } from "@/lib/video-source";

export const STORAGE_PREFIX = "storage://";

async function ping(url: string) {
  const t = Date.now();
  try {
    const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2500) });
    return { ok: r.ok || r.status === 405 || r.status === 206, ms: Date.now() - t };
  } catch {
    return { ok: false, ms: 9999 };
  }
}

export const getPlayback = createServerFn({ method: "POST" })
  .inputValidator((d) => playbackInputSchema.parse(d))
  .handler(async ({ data }) => {
    const bearer = getRequestHeader("authorization");
    const sb = publicClient(process.env["SUPABASE_URL"], process.env["SUPABASE_PUBLISHABLE_KEY"], bearer);
    if (bearer) {
      const { data: auth, error } = await sb.auth.getUser();
      if (error || !auth.user) return { error: "Please sign in again.", sources: [] };
      const { data: profile, error: profileError } = await sb.from("profiles").select("is_banned").eq("id", auth.user.id).single();
      if (profileError || !profile) return { error: "Could not verify your account.", sources: [] };
      if (!canWatch(profile)) return { error: "Your account is suspended.", sources: [] };
    }

    let q = sb
      .from("licensed_videos")
      .select("id, path, quality, source_type, server_config(id, name, base_url, priority, is_active)")
      .eq("tmdb_id", data.id)
      .eq("media_type", data.type);
    if (data.type === "tv") q = q.eq("season", data.s ?? 1).eq("episode", data.e ?? 1);
    // RLS exposes only active sources to guests and members.
    const { data: rows, error } = await q;
    if (error) {
      console.error(error);
      return { error: "Could not load sources.", sources: [] };
    }

    const needsSign = (rows ?? []).some((r) => r.server_config?.base_url.startsWith(STORAGE_PREFIX));
    const admin = needsSign ? (await import("@/integrations/supabase/client.server")).supabaseAdmin : null;

    const sources = await Promise.all(
      (rows ?? [])
        .filter((r) => r.server_config && canUseServer(r.server_config))
        .map(async (r) => {
          const srv = r.server_config;
          if (!srv) return null;
          let url: string | null = null;
          if (srv.base_url.startsWith(STORAGE_PREFIX)) {
            const bucket = srv.base_url.slice(STORAGE_PREFIX.length);
            if (!admin) return null;
            const { data: signed } = await admin.storage.from(bucket).createSignedUrl(r.path, 60 * 60 * 4);
            url = signed?.signedUrl ?? null;
          } else {
            try {
              url = resolveSourceUrl(r.path, srv.base_url);
            } catch {
              url = null;
            }
          }
          const health = url ? await ping(url) : { ok: false, ms: 9999 };
          return {
            id: r.id,
            server: srv.name,
            quality: r.quality,
            sourceType: r.source_type,
            priority: srv.priority,
            url,
            ok: health.ok,
            latencyMs: health.ms,
          };
        }),
    );
    const available = sources.filter((source): source is NonNullable<typeof source> => source !== null).filter((source) => source.url !== null);
    available.sort((a, b) => Number(b.ok) - Number(a.ok) || a.latencyMs - b.latencyMs || a.priority - b.priority);

    const { data: templates, error: settingsError } = await sb.from("site_settings").select("movie_embed_template, tv_embed_template").eq("id", 1).maybeSingle();
    if (settingsError) return { error: "Could not load playback settings.", sources: [] };
    const embedUrl = embedPlaybackUrl(data, templates ?? DEFAULT_EMBED_TEMPLATES);
    // Configurable embed URLs are rendered only in the browser, never fetched
    // server-side: this prevents settings from becoming an SSRF endpoint.
    available.unshift({
      id: "default-embed",
      server: new URL(embedUrl).hostname,
      quality: "Auto",
      sourceType: "embed",
      priority: 0,
      url: embedUrl,
      ok: true,
      latencyMs: 0,
    });

    return {
      error: available.length ? null : "This title has no source available.",
      sources: available,
    };
  });
