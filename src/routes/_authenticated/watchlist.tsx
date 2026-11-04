import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MediaCard } from "@/components/MediaCard";
import { AdSlot } from "@/components/AdSlot";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My watchlist — Layar Emas" },
      { name: "description", content: "Titles you saved to watch later." },
      { property: "og:title", content: "My watchlist — Layar Emas" },
      { property: "og:description", content: "Titles you saved to watch later." },
    ],
  }),
  component: Watchlist,
});

function Watchlist() {
  const { data, isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const { data } = await supabase.from("watchlist").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 md:px-8">
      <h1 className="text-4xl font-bold">Watchlist</h1>
      <AdSlot placement="watchlist_top" />
      {isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
      {data?.length === 0 && (
        <div className="mt-10 space-y-4">
          <p className="text-muted-foreground">Nothing saved yet.</p>
          <Button asChild variant="hero"><Link to="/">Browse titles</Link></Button>
        </div>
      )}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {data?.map((w) => (
          <MediaCard
            key={w.id}
            item={{ id: w.tmdb_id, media_type: w.media_type as "movie" | "tv", title: w.title, poster_path: w.poster_path }}
          />
        ))}
      </div>
      <AdSlot placement="watchlist_bottom" />
    </div>
  );
}
