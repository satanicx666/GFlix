import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { BrowseGrid } from "@/components/BrowseGrid";

const s = z.object({
  genre: z.string().optional(),
  year: z.coerce.number().optional(),
  country: z.string().optional(),
  page: z.coerce.number().optional(),
});

export const Route = createFileRoute("/tv-shows")({
  validateSearch: (x) => s.parse(x),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "TV Shows — Layar Emas" },
      { name: "description", content: "Browse TV series by genre, year and country, including K-drama and Indonesian series." },
      { property: "og:title", content: "TV Shows — Layar Emas" },
      { property: "og:description", content: "Browse TV series by genre, year and country." },
    ],
  }),
  component: () => {
    const search = Route.useSearch();
    const navigate = useNavigate({ from: "/tv-shows" });
    return <BrowseGrid type="tv" title="TV Shows" filters={search} onChange={(f) => navigate({ search: f })} />;
  },
});
