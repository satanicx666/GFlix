import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Clapperboard, Play, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AdSlot } from "@/components/AdSlot";
import { MediaRow } from "@/components/MediaCard";
import { tmdbImg } from "@/lib/img";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Details } from "@/lib/tmdb.functions";

export function DetailsView({ d }: { d: Details }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [trailer, setTrailer] = useState(false);
  const [season, setSeason] = useState(d.seasons[0]?.number ?? 1);
  const [episode, setEpisode] = useState(1);

  const saved = useQuery({
    queryKey: ["watchlist-item", user?.id, d.media_type, d.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("watchlist")
        .select("id")
        .eq("tmdb_id", d.id)
        .eq("media_type", d.media_type)
        .maybeSingle();
      return !!data;
    },
  });

  async function toggleSave() {
    if (!user) return;
    if (saved.data) {
      await supabase.from("watchlist").delete().eq("tmdb_id", d.id).eq("media_type", d.media_type);
      toast("Removed from watchlist");
    } else {
      const { error } = await supabase.from("watchlist").insert({
        user_id: user.id,
        tmdb_id: d.id,
        media_type: d.media_type,
        title: d.title,
        poster_path: d.poster_path,
      });
      if (error) { toast.error("Could not save"); return; }
      toast.success("Saved to watchlist");
    }
    qc.invalidateQueries({ queryKey: ["watchlist-item"] });
    qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  const backdrop = tmdbImg(d.backdrop_path, "w1280");
  const poster = tmdbImg(d.poster_path, "w500");
  const curSeason = d.seasons.find((s) => s.number === season);

  return (
    <div>
      <div className="relative min-h-[80vh] overflow-hidden">
        {backdrop && <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
        <div className="absolute inset-0 bg-fade-left" />
        <div className="absolute inset-0 bg-fade-bottom" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-12 pt-28 md:flex-row md:items-end md:px-8 md:pt-40">
          {poster && <img src={poster} alt={d.title} className="w-48 rounded-xl shadow-card md:w-64" />}
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap gap-2">
              {d.genres.map((g) => (
                <Badge key={g} variant="secondary">{g}</Badge>
              ))}
            </div>
            <h1 className="text-4xl font-bold md:text-6xl">{d.title}</h1>
            {d.tagline && <p className="font-display text-lg italic text-primary">{d.tagline}</p>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 text-primary">
                <Star className="h-4 w-4 fill-current" /> {d.vote_average.toFixed(1)}
              </span>
              {d.date && <span>{d.date.slice(0, 4)}</span>}
              {d.runtime && <span>{d.runtime} min</span>}
            </div>
            <p className="text-muted-foreground">{d.overview}</p>

            {d.media_type === "tv" && d.seasons.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={season}
                  onChange={(e) => {
                    setSeason(Number(e.target.value));
                    setEpisode(1);
                  }}
                  className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                >
                  {d.seasons.map((s) => (
                    <option key={s.number} value={s.number}>{s.name}</option>
                  ))}
                </select>
                <select
                  value={episode}
                  onChange={(e) => setEpisode(Number(e.target.value))}
                  className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                >
                  {Array.from({ length: curSeason?.episodes ?? 1 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Episode {n}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild variant="hero" size="lg">
                  <Link
                    to="/watch/$type/$id"
                    params={{ type: d.media_type, id: String(d.id) }}
                    search={d.media_type === "tv" ? { s: season, e: episode } : {}}
                  >
                    <Play className="fill-current" /> Play
                  </Link>
                </Button>
              {d.trailerKey && (
                <Button variant="glass" size="lg" onClick={() => setTrailer(true)}>
                  <Clapperboard /> Trailer
                </Button>
              )}
              {user && (
                <Button variant="glass" size="lg" onClick={toggleSave}>
                  {saved.data ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
                  {saved.data ? "Saved" : "Watchlist"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <AdSlot placement="details" />
      {d.cast.length > 0 && (
        <section className="mx-auto max-w-7xl space-y-3 px-4 py-8 md:px-8">
          <h2 className="text-2xl font-semibold">Cast</h2>
          <div className="scrollbar-none flex gap-4 overflow-x-auto pb-2">
            {d.cast.map((c) => (
              <div key={c.id} className="w-24 shrink-0 text-center">
                <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-card">
                  {c.profile_path && <img src={tmdbImg(c.profile_path, "w185") ?? undefined} alt={c.name} loading="lazy" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 text-xs font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.character}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="pb-12">
        <AdSlot placement="details_bottom" />
        <MediaRow title="More like this" items={d.similar} />
      </div>

      <Dialog open={trailer} onOpenChange={setTrailer}>
        <DialogContent className="max-w-4xl p-0">
          <DialogTitle className="sr-only">Trailer</DialogTitle>
          {trailer && d.trailerKey && (
            <iframe
              className="aspect-video w-full rounded-lg"
              src={`https://www.youtube.com/embed/${d.trailerKey}?autoplay=1`}
              allow="autoplay; encrypted-media; fullscreen"
              title="Trailer"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
