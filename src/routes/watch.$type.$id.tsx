import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { entryKey, parsePlayerMessage, readEntries, saveEntry, withResume } from "@/lib/continue-watching";
import { z } from "zod";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlayback } from "@/lib/play.functions";
import { CreatePartyDialog } from "@/components/CreatePartyDialog";

import { useAuth } from "@/lib/auth";
import { AdSlot } from "@/components/AdSlot";
import { Preroll } from "@/components/Preroll";
import { adsQuery } from "@/lib/advertisements.functions";
import { adsForPlacement } from "@/lib/advertisements";
import { getDetails } from "@/lib/tmdb.functions";
import { NextEpisodeButton, PrevEpisodeButton, WatchExtras } from "@/components/WatchExtras";

const watchDetailsQuery = (type: string, id: string) => queryOptions({
  queryKey: ["details", type === "tv" ? "tv" : "movie", Number(id)],
  queryFn: () => getDetails({ data: { type: type === "tv" ? "tv" : "movie", id: Number(id) } }),
  staleTime: 300_000,
});

export const Route = createFileRoute("/watch/$type/$id")({
  validateSearch: (s) => z.object({ s: z.coerce.number().int().positive().optional(), e: z.coerce.number().int().positive().optional() }).parse(s),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(watchDetailsQuery(params.type, params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: `Watch ${loaderData?.title ?? "movies and series"} — Layar Emas` },
      { name: "description", content: `Watch ${loaderData?.title ?? "movies and series"} on Layar Emas and explore episodes or recommended films.` },
      { property: "og:title", content: `Watch ${loaderData?.title ?? "movies and series"} — Layar Emas` },
      { property: "og:description", content: `Watch ${loaderData?.title ?? "movies and series"} on Layar Emas and explore episodes or recommended films.` },
    ],
  }),
  component: Watch,
});

function Watch() {
  const { type, id } = Route.useParams();
  const { s, e } = Route.useSearch();
  return <WatchPlayer key={`${type}/${id}/${s}/${e}`} type={type} id={id} s={s} e={e} />;
}

function WatchPlayer({ type, id, s, e }: { type: string; id: string; s: number | undefined; e: number | undefined }) {
  const { data: details } = useSuspenseQuery(watchDetailsQuery(type, id));
  const { user, loading } = useAuth();
  const fetchPlayback = useServerFn(getPlayback);
  const mediaType = type === "tv" ? "tv" : "movie";
  const { data, isLoading, error } = useQuery({
    queryKey: ["playback", user?.id, type, id, s, e],
    enabled: !loading,
    queryFn: () => fetchPlayback({ data: { type: mediaType, id: Number(id), s, e } }),
  });
  const [idx, setIdx] = useState(0);
  const [completedAds, setCompletedAds] = useState<string[]>([]);
  const ads = useQuery(adsQuery);
  const preroll = adsForPlacement(ads.data ?? [], "preroll").find((ad) => ad.id && !completedAds.includes(ad.id));
  const src = data?.sources[idx] ?? data?.sources[0];
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [resumeAt, setResumeAt] = useState<number | undefined>(undefined);
  useEffect(() => {
    const saved = readEntries().find((x) => x.key === entryKey(mediaType, Number(id)));
    const same = saved && (mediaType === "movie" || (saved.season === (s ?? 1) && saved.episode === (e ?? 1)));
    if (same) setResumeAt(saved.currentTime);
    saveEntry({
      key: entryKey(mediaType, Number(id)), type: mediaType, id: Number(id), title: details.title,
      backdrop: details.backdrop_path ?? null, poster: details.poster_path ?? null,
      season: mediaType === "tv" ? s ?? 1 : undefined, episode: mediaType === "tv" ? e ?? 1 : undefined,
      currentTime: same ? saved.currentTime : 0, duration: same ? saved.duration : 0, updatedAt: Date.now(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, id, s, e]);
  useEffect(() => {
    let last = 0;
    const onMessage = (ev: MessageEvent) => {
      if (!frameRef.current || ev.source !== frameRef.current.contentWindow) return;
      const msg = parsePlayerMessage(ev.data);
      if (!msg || !["timeupdate", "pause", "ended"].includes(msg.event)) return;
      const now = Date.now();
      if (msg.event === "timeupdate" && now - last < 5000) return;
      last = now;
      saveEntry({
        key: entryKey(mediaType, Number(id)), type: mediaType, id: Number(id), title: details.title,
        backdrop: details.backdrop_path ?? null, poster: details.poster_path ?? null,
        season: mediaType === "tv" ? s ?? 1 : undefined, episode: mediaType === "tv" ? e ?? 1 : undefined,
        currentTime: msg.event === "ended" ? msg.duration : msg.currentTime, duration: msg.duration, updatedAt: now,
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mediaType, id, s, e, details]);
  const back =
    mediaType === "movie" ? (
      <Link to="/movie/$id" params={{ id }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
    ) : (
      <Link to="/tv/$id" params={{ id }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pb-16 pt-24 md:px-8">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold md:text-3xl">{details.title}</h1>{mediaType === "tv" && <p className="mt-1 text-sm text-muted-foreground">Season {s ?? 1} · Episode {e ?? 1}</p>}</div>
        {mediaType === "tv" && (
          <div className="flex items-center gap-2">
            <PrevEpisodeButton details={details} season={s ?? 1} episode={e ?? 1} />
            <NextEpisodeButton details={details} season={s ?? 1} episode={e ?? 1} />
          </div>
        )}
      </div>
      <AdSlot placement="watch_top" />
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-card shadow-card">
        {(loading || isLoading || ads.isLoading) && <div className="flex h-full items-center justify-center text-muted-foreground">Loading player…</div>}
        {data?.error && !isLoading && <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">{data.error}</div>}
        {error && <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">Could not load playback. Please refresh.</div>}
        {src && !ads.isLoading && preroll ? (
          <Preroll key={preroll.id} ad={preroll} onComplete={() => { const adId = preroll.id; if (adId) setCompletedAds((ids) => [...ids, adId]); }} />
        ) : src?.url && !ads.isLoading ? (
          src.sourceType === "embed" ? <iframe ref={frameRef} key={src.url} src={withResume(src.url, resumeAt)} title="Licensed video player" allow="encrypted-media; autoplay *; fullscreen *; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full" /> :
          <video key={src.url} src={src.url} controls autoPlay className="h-full w-full bg-background" />
        ) : null}
      </div>
      <AdSlot placement="watch_bottom" />
      {data && data.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Servers:</span>
          {data.sources.map((x, i) => (
            <Button key={x.id} size="sm" variant={i === idx ? "hero" : "secondary"} onClick={() => setIdx(i)}>
              {i === 0 && <Zap />} {x.server} · {x.quality}
              <span className="text-xs opacity-70">{x.ok ? `${x.latencyMs}ms` : "slow"}</span>
            </Button>
          ))}
          {user && <CreatePartyDialog type={mediaType} tmdbId={Number(id)} title={details.title} season={s ?? 1} episode={e ?? 1} />}
        </div>
      )}
      <WatchExtras details={details} season={s ?? 1} episode={e ?? 1} />
    </div>
  );
}
