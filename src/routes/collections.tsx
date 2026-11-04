import { createFileRoute, Link } from "@tanstack/react-router";
import { COLLECTIONS } from "@/lib/catalog";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Collections & studios — Layar Emas" },
      { name: "description", content: "Marvel Studios, Pixar, Toy Story, Harry Potter, Star Wars and more." },
      { property: "og:title", content: "Collections & studios — Layar Emas" },
      { property: "og:description", content: "Marvel Studios, Pixar, Toy Story, Harry Potter, Star Wars and more." },
    ],
  }),
  component: Collections,
});

function Collections() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 md:px-8">
      <h1 className="text-5xl font-bold">Collections</h1>
      <p className="mt-2 text-muted-foreground">Studios and film franchises.</p>
      <AdSlot placement="collection_top" />
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {COLLECTIONS.map((c) => (
          <Link
            key={`${c.kind}-${c.id}`}
            to="/collection/$kind/$id"
            params={{ kind: c.kind, id: String(c.id) }}
            className="group relative flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-glow"
          >
            <span className="text-xs uppercase tracking-widest text-primary">{c.note}</span>
            <span className="font-display text-2xl font-bold group-hover:text-primary">{c.name}</span>
          </Link>
        ))}
      </div>
      <AdSlot placement="collection_bottom" />
    </div>
  );
}
