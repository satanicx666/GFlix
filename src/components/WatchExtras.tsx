import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Play, Radio, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaRow } from "@/components/MediaCard";
import { AdSlot } from "@/components/AdSlot";
import { getMovieRecommendations, getSeasonEpisodes, type Details } from "@/lib/tmdb.functions";
import { tmdbImg } from "@/lib/img";

export function WatchExtras({ details, season, episode }: { details: Details; season: number; episode: number }) {
  return details.media_type === "tv"
    ? <><AdSlot placement="watch_episodes" /><EpisodeList details={details} season={season} episode={episode} /></>
    : <><AdSlot placement="watch_recommendations" /><MovieRecommendations details={details} /></>;
}

/** Resolves the next episode coordinates: next episode in the season, or episode 1 of the next season. */
export function useNextEpisode(details: Details, season: number, episode: number) {
  const fetchEpisodes = useServerFn(getSeasonEpisodes);
  const query = useQuery({
    queryKey: ["watch-episodes", details.id, season],
    queryFn: () => fetchEpisodes({ data: { id: details.id, season } }),
    staleTime: 300_000,
  });
  if (details.media_type !== "tv") return { next: null, isPending: query.isPending };
  const episodes = query.data ?? [];
  if (episodes.some((item) => item.number === episode + 1)) return { next: { season, episode: episode + 1 }, isPending: query.isPending };
  const nextSeason = details.seasons.find((item) => item.number === season + 1);
  if (nextSeason && query.data) return { next: { season: season + 1, episode: 1 }, isPending: false };
  return { next: null, isPending: query.isPending };
}

/** Resolves the previous episode coordinates: previous episode in the season, or the last episode of the previous season. */
export function usePrevEpisode(details: Details, season: number, episode: number) {
  const fetchEpisodes = useServerFn(getSeasonEpisodes);
  const prevSeason = season - 1;
  const needsPrevSeason = episode === 1 && details.seasons.some((item) => item.number === prevSeason);
  const query = useQuery({
    queryKey: ["watch-episodes", details.id, prevSeason],
    queryFn: () => fetchEpisodes({ data: { id: details.id, season: prevSeason } }),
    staleTime: 300_000,
    enabled: details.media_type === "tv" && needsPrevSeason,
  });
  if (details.media_type !== "tv") return { prev: null, isPending: false };
  if (episode > 1) return { prev: { season, episode: episode - 1 }, isPending: false };
  if (!needsPrevSeason) return { prev: null, isPending: false };
  if (query.isPending) return { prev: null, isPending: true };
  const lastEp = query.data?.length ? query.data[query.data.length - 1] : undefined;
  const last = lastEp ? lastEp.number : null;
  return { prev: last ? { season: prevSeason, episode: last } : null, isPending: false };
}

export function PrevEpisodeButton({ details, season, episode }: { details: Details; season: number; episode: number }) {
  const { prev, isPending } = usePrevEpisode(details, season, episode);
  if (details.media_type !== "tv") return null;
  if (isPending) return <Button size="sm" variant="secondary" disabled><SkipBack /> Previous…</Button>;
  if (!prev) return null;
  return <Button size="sm" variant="secondary" asChild>
    <Link to="/watch/$type/$id" params={{ type: "tv", id: String(details.id) }} search={{ s: prev.season, e: prev.episode }} aria-label={`Previous episode: season ${prev.season} episode ${prev.episode}`}>
      <SkipBack /> Previous episode
    </Link>
  </Button>;
}

export function NextEpisodeButton({ details, season, episode }: { details: Details; season: number; episode: number }) {
  const { next, isPending } = useNextEpisode(details, season, episode);
  if (details.media_type !== "tv") return null;
  if (isPending) return <Button size="sm" variant="secondary" disabled><SkipForward /> Next episode…</Button>;
  if (!next) return null;
  return <Button size="sm" variant="hero" asChild>
    <Link to="/watch/$type/$id" params={{ type: "tv", id: String(details.id) }} search={{ s: next.season, e: next.episode }} aria-label={`Next episode: season ${next.season} episode ${next.episode}`}>
      <SkipForward /> Next episode
    </Link>
  </Button>;
}

function MovieRecommendations({ details }: { details: Details }) {
  const fetchRecommendations = useServerFn(getMovieRecommendations);
  const query = useQuery({
    queryKey: ["watch-recommendations", details.id],
    queryFn: () => fetchRecommendations({ data: { id: details.id } }),
    staleTime: 300_000,
  });
  const items = query.data?.length ? query.data : details.similar.filter((item) => item.id !== details.id);
  return <div className="pt-6">
    {query.isPending && !items.length ? <p className="text-sm text-muted-foreground">Loading recommendations…</p>
      : items.length ? <div className="-mx-4 md:-mx-8"><MediaRow title="Recommended movies" items={items} /></div>
      : <section className="space-y-3"><h2 className="text-2xl font-semibold">Recommended movies</h2>
        <p className="text-sm text-muted-foreground">No recommendations available for this movie.</p>
        {query.isError && <Button variant="secondary" onClick={() => void query.refetch()}>Try again</Button>}
      </section>}
  </div>;
}

function EpisodeList({ details, season, episode }: { details: Details; season: number; episode: number }) {
  const [selectedSeason, setSelectedSeason] = useState(season);
  const fetchEpisodes = useServerFn(getSeasonEpisodes);
  const query = useQuery({
    queryKey: ["watch-episodes", details.id, selectedSeason],
    queryFn: () => fetchEpisodes({ data: { id: details.id, season: selectedSeason } }),
    staleTime: 300_000,
  });
  const seasons = details.seasons.some((item) => item.number === season)
    ? details.seasons : [{ number: season, name: `Season ${season}`, episodes: 0 }, ...details.seasons];
  return <section className="space-y-5 border-t border-border pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-semibold">Episodes</h2><p className="mt-1 text-sm text-muted-foreground">{details.title}</p></div>
      <Select value={String(selectedSeason)} onValueChange={(value) => setSelectedSeason(Number(value))}>
        <SelectTrigger className="w-44" aria-label="Select season"><SelectValue /></SelectTrigger>
        <SelectContent>{seasons.map((item) => <SelectItem key={item.number} value={String(item.number)}>{item.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    {query.isPending ? <p className="py-8 text-sm text-muted-foreground">Loading episodes…</p>
      : query.isError ? <div className="space-y-3 py-4"><p className="text-sm text-muted-foreground">Could not load episodes.</p><Button variant="secondary" onClick={() => void query.refetch()}>Try again</Button></div>
      : !query.data?.length ? <p className="py-8 text-sm text-muted-foreground">No episodes available for this season.</p>
      : <div className="grid gap-3 md:grid-cols-2">
        {query.data.map((item) => {
          const active = selectedSeason === season && item.number === episode;
          const image = tmdbImg(item.still, "w342");
          return <Button key={item.id} asChild variant="ghost" className={`h-auto justify-start overflow-hidden rounded-lg border p-0 text-left whitespace-normal ${active ? "border-primary bg-primary/10 hover:bg-primary/15" : "border-border bg-card hover:bg-accent"}`}>
            <Link to="/watch/$type/$id" params={{ type: "tv", id: String(details.id) }} search={{ s: selectedSeason, e: item.number }} aria-label={`Play season ${selectedSeason} episode ${item.number}: ${item.title}`} aria-current={active ? "true" : undefined} className="group flex w-full min-w-0 items-start gap-3">
              <div className="relative aspect-video w-28 shrink-0 self-center overflow-hidden bg-muted sm:w-36">
                {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Play className="h-6 w-6" /></div>}
                {active && <div className="absolute inset-0 grid place-items-center bg-background/60 text-primary"><Radio className="h-6 w-6" /></div>}
              </div>
              <div className="min-w-0 flex-1 py-3 pr-3">
                <p className={`text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>{active ? "Now playing · " : ""}Episode {item.number}{item.runtime ? ` · ${item.runtime} min` : ""}</p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold">{item.title}</p>
                {item.overview && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.overview}</p>}
              </div>
            </Link>
          </Button>;
        })}
      </div>}
  </section>;
}