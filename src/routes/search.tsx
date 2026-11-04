import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { searchMedia } from "@/lib/tmdb.functions";
import { MediaCard } from "@/components/MediaCard";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/search")({
  validateSearch: (s) => z.object({ q: z.string().optional().default("") }).parse(s),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Search — Layar Emas" },
      { name: "description", content: "Search movies and TV shows." },
      { property: "og:title", content: "Search — Layar Emas" },
      { property: "og:description", content: "Search movies and TV shows." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const res = useQuery({ queryKey: ["search", q], queryFn: () => searchMedia({ data: { q } }), enabled: !!q });
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 md:px-8">
      <h1 className="text-3xl font-bold">{q ? <>Results for “{q}”</> : "Search"}</h1>
      {!q && <p className="mt-2 text-muted-foreground">Type a title in the search bar above.</p>}
      <AdSlot placement="search_top" />
      {res.isLoading && <p className="mt-6 text-muted-foreground">Searching…</p>}
      {res.data && res.data.length === 0 && <p className="mt-6 text-muted-foreground">No titles found.</p>}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {res.data?.map((i) => <MediaCard key={`${i.media_type}-${i.id}`} item={i} />)}
      </div>
      <AdSlot placement="search_bottom" />
    </div>
  );
}
