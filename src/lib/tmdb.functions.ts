import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type MediaType = "movie" | "tv";
export interface MediaItem {
  id: number;
  media_type: MediaType;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  date: string | null;
}

export async function tmdb(path: string, params: Record<string, string> = {}) {
  const key = process.env["TMDB_API_KEY"];
  if (!key) throw new Error("TMDB key missing");
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  const headers: Record<string, string> = { accept: "application/json" };
  if (key.startsWith("eyJ")) headers["Authorization"] = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    console.error("TMDB error", res.status, path);
    throw new Error("Could not load titles right now");
  }
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function norm(r: any, fallback?: MediaType): MediaItem | null {
  const media_type = (r.media_type ?? fallback) as MediaType;
  if (media_type !== "movie" && media_type !== "tv") return null;
  return {
    id: r.id,
    media_type,
    title: r.title ?? r.name ?? "Untitled",
    overview: r.overview ?? "",
    poster_path: r.poster_path ?? null,
    backdrop_path: r.backdrop_path ?? null,
    vote_average: r.vote_average ?? 0,
    date: r.release_date ?? r.first_air_date ?? null,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const list = (results: any[], t?: MediaType) => results.map((r) => norm(r, t)).filter(Boolean) as MediaItem[];

export const getHome = createServerFn({ method: "GET" }).handler(async () => {
  const [trending, movies, tv, top, indo] = await Promise.all([
    tmdb("/trending/all/week"),
    tmdb("/movie/popular"),
    tmdb("/tv/popular"),
    tmdb("/movie/top_rated"),
    tmdb("/discover/movie", { with_original_language: "id", sort_by: "popularity.desc" }),
  ]);
  const { persistTmdbCatalog } = await import("./catalog-store.server");
  await persistTmdbCatalog([...list(trending.results), ...list(movies.results, "movie"), ...list(tv.results, "tv"), ...list(top.results, "movie"), ...list(indo.results, "movie")]);
  return {
    trending: list(trending.results),
    movies: list(movies.results, "movie"),
    tv: list(tv.results, "tv"),
    top: list(top.results, "movie"),
    indo: list(indo.results, "movie"),
  };
});

export const searchMedia = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().max(120) }).parse(d))
  .handler(async ({ data }) => {
    if (!data.q.trim()) return [] as MediaItem[];
    const r = await tmdb("/search/multi", { query: data.q, include_adult: "false" });
    const items = list(r.results);
    const { persistTmdbCatalog } = await import("./catalog-store.server");
    await persistTmdbCatalog(items);
    return items;
  });

export const getDetails = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ type: z.enum(["movie", "tv"]), id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { readCatalogDetails, persistTmdbCatalog } = await import("./catalog-store.server");
    const cached = await readCatalogDetails(data.type, data.id);
    const r = cached ?? await tmdb(`/${data.type}/${data.id}`, { append_to_response: "videos,credits,similar" });
    const base = norm(r, data.type);
    if (!base) throw new Error("Title not found");
    if (!cached) await persistTmdbCatalog([base], { type: data.type, id: data.id, raw: r });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trailer = (r.videos?.results ?? []).find((v: any) => v.site === "YouTube" && v.type === "Trailer");
    return {
      ...base,
      tagline: (r.tagline as string) ?? "",
      runtime: (r.runtime ?? r.episode_run_time?.[0] ?? null) as number | null,
      genres: ((r.genres ?? []) as { name: string }[]).map((g) => g.name),
      trailerKey: (trailer?.key as string) ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cast: ((r.credits?.cast ?? []) as any[]).slice(0, 10).map((c) => ({
        id: c.id as number,
        name: c.name as string,
        character: (c.character ?? "") as string,
        profile_path: (c.profile_path ?? null) as string | null,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seasons: ((r.seasons ?? []) as any[])
        .filter((s) => s.season_number > 0)
        .map((s) => ({ number: s.season_number as number, name: s.name as string, episodes: s.episode_count as number })),
      similar: list(r.similar?.results ?? [], data.type).slice(0, 12),
    };
  });

export type Details = Awaited<ReturnType<typeof getDetails>>;

export const getSeasonEpisodes = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.number().int().positive(), season: z.number().int().nonnegative() }).parse(d))
  .handler(async ({ data }) => {
    const r = await tmdb(`/tv/${data.id}/season/${data.season}`);
    const episodes = z.array(z.object({
      id: z.number(), episode_number: z.number().int(), name: z.string(),
      overview: z.string().nullish(), still_path: z.string().nullish(),
      runtime: z.number().nullish(), air_date: z.string().nullish(),
    })).parse(r.episodes ?? []);
    return episodes.map((episode) => ({
      id: episode.id, number: episode.episode_number, title: episode.name,
      overview: episode.overview ?? "", still: episode.still_path ?? null,
      runtime: episode.runtime ?? null, airDate: episode.air_date ?? null,
    }));
  });

export const getMovieRecommendations = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const r = await tmdb(`/movie/${data.id}/recommendations`);
    const items = list(r.results ?? [], "movie").filter((item) => item.id !== data.id);
    const { persistTmdbCatalog } = await import("./catalog-store.server");
    await persistTmdbCatalog(items);
    return items;
  });

// Lightweight preview for hover cards: details + trailer in one call.
export const getHoverPreview = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ type: z.enum(["movie", "tv"]), id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const details = await getDetails({ data });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      overview: details.overview,
      tagline: details.tagline,
      genres: details.genres.slice(0, 3),
      runtime: details.runtime,
      vote: details.vote_average,
      year: (details.date ?? "").slice(0, 4),
      trailerKey: details.trailerKey,
      backdrop: details.backdrop_path,
    };
  });

export type HoverPreviewData = Awaited<ReturnType<typeof getHoverPreview>>;
