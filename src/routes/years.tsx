import { createFileRoute, Link } from "@tanstack/react-router";
import { YEARS } from "@/lib/catalog";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/years")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Browse by year — Layar Emas" },
      { name: "description", content: "Find movies and TV shows released in any year." },
      { property: "og:title", content: "Browse by year — Layar Emas" },
      { property: "og:description", content: "Find movies and TV shows released in any year." },
    ],
  }),
  component: Years,
});

function Years() {
  const decades = [...new Set(YEARS.map((y) => Math.floor(y / 10) * 10))];
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 pb-16 pt-28 md:px-8">
      <h1 className="text-5xl font-bold">Years</h1>
      <AdSlot placement="browse_top" />
      {decades.map((d) => (
        <section key={d}>
          <h2 className="mb-3 font-display text-2xl text-primary">{d}s</h2>
          <div className="flex flex-wrap gap-2">
            {YEARS.filter((y) => Math.floor(y / 10) * 10 === d).map((y) => (
              <div key={y} className="flex overflow-hidden rounded-full border border-border bg-card text-sm">
                <span className="px-3 py-1.5 font-semibold">{y}</span>
                <Link to="/movies" search={{ year: y }} className="border-l border-border px-3 py-1.5 text-muted-foreground hover:text-primary">Movies</Link>
                <Link to="/tv-shows" search={{ year: y }} className="border-l border-border px-3 py-1.5 text-muted-foreground hover:text-primary">TV</Link>
              </div>
            ))}
          </div>
        </section>
      ))}
      <AdSlot placement="browse_bottom" />
    </div>
  );
}
