import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getGenres } from "@/lib/browse.functions";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/genres")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Genres — Layar Emas" },
      { name: "description", content: "Browse movies and TV shows by genre." },
      { property: "og:title", content: "Genres — Layar Emas" },
      { property: "og:description", content: "Browse movies and TV shows by genre." },
    ],
  }),
  component: Genres,
});

function Genres() {
  const m = useQuery({ queryKey: ["genres", "movie"], queryFn: () => getGenres({ data: { type: "movie" } }) });
  const t = useQuery({ queryKey: ["genres", "tv"], queryFn: () => getGenres({ data: { type: "tv" } }) });
  const chip = "rounded-2xl border border-border bg-card px-5 py-4 font-display text-lg transition hover:border-primary hover:text-primary";
  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 pb-16 pt-28 md:px-8">
      <h1 className="text-5xl font-bold">Genres</h1>
      <AdSlot placement="browse_top" />
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Movies</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {m.data?.map((g) => (
            <Link key={g.id} to="/movies" search={{ genre: String(g.id) }} className={chip}>{g.name}</Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-2xl font-semibold">TV Shows</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {t.data?.map((g) => (
            <Link key={g.id} to="/tv-shows" search={{ genre: String(g.id) }} className={chip}>{g.name}</Link>
          ))}
        </div>
      </section>
      <AdSlot placement="browse_bottom" />
    </div>
  );
}
