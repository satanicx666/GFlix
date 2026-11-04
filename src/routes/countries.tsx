import { createFileRoute, Link } from "@tanstack/react-router";
import { COUNTRIES } from "@/lib/catalog";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/countries")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Browse by country — Layar Emas" },
      { name: "description", content: "Indonesian, Korean, Japanese, Hollywood and more — browse by country." },
      { property: "og:title", content: "Browse by country — Layar Emas" },
      { property: "og:description", content: "Browse movies and TV shows by country." },
    ],
  }),
  component: Countries,
});

const flag = (code: string) => String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));

function Countries() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 md:px-8">
      <h1 className="text-5xl font-bold">Countries</h1>
      <AdSlot placement="browse_top" />
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COUNTRIES.map((c) => (
          <div key={c.code} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-3xl">{flag(c.code)}</p>
            <p className="mt-2 font-display text-xl">{c.name}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <Link to="/movies" search={{ country: c.code }} className="text-primary hover:underline">Movies</Link>
              <Link to="/tv-shows" search={{ country: c.code }} className="text-primary hover:underline">TV Shows</Link>
            </div>
          </div>
        ))}
      </div>
      <AdSlot placement="browse_bottom" />
    </div>
  );
}
