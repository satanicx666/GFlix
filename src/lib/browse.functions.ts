import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MediaItem, MediaType } from "@/lib/tmdb.functions";
import { tmdb } from "@/lib/tmdb.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const norm = (r: any, t: MediaType): MediaItem => ({
  id: r.id,
  media_type: t,
  title: r.title ?? r.name ?? "Untitled",
  overview: r.overview ?? "",
  poster_path: r.poster_path ?? null,
  backdrop_path: r.backdrop_path ?? null,
  vote_average: r.vote_average ?? 0,
  date: r.release_date ?? r.first_air_date ?? null,
});

export const discover = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        type: z.enum(["movie", "tv"]),
        genre: z.string().optional(),
        year: z.number().int().optional(),
        country: z.string().max(3).optional(),
        company: z.number().int().optional(),
        sort: z.string().optional(),
        page: z.number().int().min(1).max(500).default(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const p: Record<string, string> = {
      sort_by: data.sort ?? "popularity.desc",
      page: String(data.page),
      include_adult: "false",
    };
    if (data.genre) p["with_genres"] = data.genre;
    if (data.year) p[data.type === "movie" ? "primary_release_year" : "first_air_date_year"] = String(data.year);
    if (data.country) p["with_origin_country"] = data.country;
    if (data.company) p["with_companies"] = String(data.company);
    const r = await tmdb(`/discover/${data.type}`, p);
    const { persistTmdbCatalog } = await import("./catalog-store.server");
    await persistTmdbCatalog(r.results.map((x: Parameters<typeof norm>[0]) => norm(x, data.type)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { results: (r.results as any[]).map((x) => norm(x, data.type)), totalPages: Math.min(r.total_pages ?? 1, 500) };
  });

export const getGenres = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ type: z.enum(["movie", "tv"]) }).parse(d))
  .handler(async ({ data }) => {
    const r = await tmdb(`/genre/${data.type}/list`);
    return r.genres as { id: number; name: string }[];
  });

export const getCollection = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ kind: z.enum(["collection", "company"]), id: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    if (data.kind === "collection") {
      const r = await tmdb(`/collection/${data.id}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts = ((r.parts ?? []) as any[])
        .map((x) => norm(x, "movie"))
        .sort((a, b) => (a.date ?? "9").localeCompare(b.date ?? "9"));
      const { persistTmdbCatalog } = await import("./catalog-store.server");
      await persistTmdbCatalog(parts);
      return { name: r.name as string, overview: (r.overview ?? "") as string, backdrop_path: r.backdrop_path as string | null, items: parts };
    }
    const [c, m1, m2] = await Promise.all([
      tmdb(`/company/${data.id}`),
      tmdb(`/discover/movie`, { with_companies: String(data.id), sort_by: "popularity.desc" }),
      tmdb(`/discover/movie`, { with_companies: String(data.id), sort_by: "popularity.desc", page: "2" }),
    ]);
    const { persistTmdbCatalog } = await import("./catalog-store.server");
    await persistTmdbCatalog([...m1.results, ...m2.results].map((x: Parameters<typeof norm>[0]) => norm(x, "movie")));
    return {
      name: c.name as string,
      overview: (c.description ?? "") as string,
      backdrop_path: (m1.results?.[0]?.backdrop_path ?? null) as string | null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: [...m1.results, ...m2.results].map((x: any) => norm(x, "movie")),
    };
  });
