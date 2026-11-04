import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { BrowseGrid } from "@/components/BrowseGrid";

const browseSearch = z.object({
  genre: z.string().optional(),
  year: z.coerce.number().optional(),
  country: z.string().optional(),
  page: z.coerce.number().optional(),
});

export const Route = createFileRoute("/movies")({
  validateSearch: (s) => browseSearch.parse(s),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Movies — Layar Emas" },
      { name: "description", content: "Browse movies by genre, year and country." },
      { property: "og:title", content: "Movies — Layar Emas" },
      { property: "og:description", content: "Browse movies by genre, year and country." },
    ],
  }),
  component: () => {
    const search = Route.useSearch();
    const navigate = useNavigate({ from: "/movies" });
    return <BrowseGrid type="movie" title="Movies" filters={search} onChange={(f) => navigate({ search: f })} />;
  },
});
