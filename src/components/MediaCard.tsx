import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, Play, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { previewGate } from "@/lib/preview-gate";
import type { HoverPreviewData, MediaItem } from "@/lib/tmdb.functions";
import { getHoverPreview } from "@/lib/tmdb.functions";
import { tmdbImg } from "@/lib/img";

const previewCache = new Map<string, HoverPreviewData>();
const PREVIEW_W = 340;
const PREVIEW_H = 400;

export function MediaCard({ item }: { item: Pick<MediaItem, "id" | "media_type" | "title" | "poster_path"> & Partial<MediaItem> }) {
  const img = tmdbImg(item.poster_path, "w342");
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const tokenRef = useRef<symbol | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [preview, setPreview] = useState<HoverPreviewData | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onLeave = () => {
    window.clearTimeout(timer.current);
    if (tokenRef.current) previewGate.release(tokenRef.current);
    tokenRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
    setPreview(null);
    setPos(null);
  };

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    if (tokenRef.current) previewGate.release(tokenRef.current);
    cleanupRef.current?.();
  }, []);

  const show = async (token: symbol) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const key = `${item.media_type}-${item.id}`;
    let p = previewCache.get(key);
    if (!p) {
      try {
        p = await getHoverPreview({ data: { type: item.media_type, id: item.id } });
        previewCache.set(key, p);
      } catch {
        return;
      }
    }
    if (!previewGate.owns(token) || tokenRef.current !== token) return;
    const r = wrapRef.current?.getBoundingClientRect() ?? rect;
    let x = r.left + r.width / 2 - PREVIEW_W / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - PREVIEW_W - 8));
    let y = r.top + r.height / 2 - PREVIEW_H / 2;
    y = Math.max(8, Math.min(y, window.innerHeight - PREVIEW_H - 8));
    setPos({ x, y });
    setPreview(p);
  };

  const onEnter = () => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    onLeave();
    const token = previewGate.claim(onLeave);
    tokenRef.current = token;
    window.addEventListener("scroll", onLeave, true);
    window.addEventListener("wheel", onLeave, { capture: true, passive: true });
    window.addEventListener("resize", onLeave);
    window.addEventListener("blur", onLeave);
    const visibility = () => { if (document.hidden) onLeave(); };
    document.addEventListener("visibilitychange", visibility);
    cleanupRef.current = () => {
      window.removeEventListener("scroll", onLeave, true);
      window.removeEventListener("wheel", onLeave, true);
      window.removeEventListener("resize", onLeave);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", visibility);
    };
    timer.current = window.setTimeout(() => void show(token), 450);
  };

  const year = (item.date ?? "").slice(0, 4);
  const inner = (
    <div className="group">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-card transition duration-300 group-hover:ring-2 group-hover:ring-primary/70">
        {img ? (
          <img src={img} alt={item.title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-sm text-muted-foreground">{item.title}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        <div className="absolute left-1.5 top-1.5 flex gap-1">
          <span className="rounded border border-primary/60 bg-background/70 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-primary backdrop-blur-sm">HD</span>
          <span className="rounded border border-foreground/30 bg-background/70 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none backdrop-blur-sm">{item.media_type === "tv" ? "TV" : "Movie"}</span>
        </div>
        {item.vote_average ? (
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-background/75 px-1.5 py-0.5 text-[11px] font-semibold text-primary backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-current" /> {item.vote_average.toFixed(1)}
          </span>
        ) : null}
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-semibold">{item.title}</p>
        {year && <p className="mt-0.5 truncate text-xs text-muted-foreground">{year}</p>}
      </div>
    </div>
  );

  const link =
    item.media_type === "movie" ? (
      <Link to="/movie/$id" params={{ id: String(item.id) }} preload="intent">{inner}</Link>
    ) : (
      <Link to="/tv/$id" params={{ id: String(item.id) }} preload="intent">{inner}</Link>
    );

  return (
    <div ref={wrapRef} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onLeave}>
      {link}
      {preview && pos ? createPortal(
        <div
          data-testid="media-preview"
          className="pointer-events-none fixed z-50 overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
          style={{ left: pos.x, top: pos.y, width: PREVIEW_W, height: PREVIEW_H }}
        >
          <div className="relative h-44 w-full bg-background">
            {preview.trailerKey ? (
              <iframe
                src={`https://www.youtube.com/embed/${preview.trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${preview.trailerKey}&modestbranding=1&rel=0`}
                title={`${item.title} trailer`}
                className="h-full w-full"
                allow="autoplay; encrypted-media"
              />
            ) : preview.backdrop ? (
              <img src={tmdbImg(preview.backdrop, "w780") ?? ""} alt="" className="h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-fade-bottom" />
          </div>
          <div className="space-y-2 p-4">
            <p className="line-clamp-1 font-semibold">{item.title}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {preview.vote ? (
                <span className="flex items-center gap-1 text-primary">
                  <Star className="h-3 w-3 fill-current" /> {preview.vote.toFixed(1)}
                </span>
              ) : null}
              {preview.year ? <span>{preview.year}</span> : null}
              {preview.runtime ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {preview.runtime} min
                </span>
              ) : null}
            </div>
            {preview.genres.length ? (
              <div className="flex flex-wrap gap-1.5">
                {preview.genres.map((g) => (
                  <span key={g} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {g}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{preview.overview || preview.tagline}</p>
            <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-primary">
              <Play className="h-3.5 w-3.5 fill-current" /> Klik untuk detail &amp; nonton
            </p>
          </div>
        </div>, document.body
      ) : null}
    </div>
  );
}

export function MediaRow({ title, items }: { title: string; items: MediaItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-4 md:px-8">
        <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
        <div className="hidden gap-2 md:flex">
          <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition hover:border-primary hover:text-primary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition hover:border-primary hover:text-primary">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="group/row relative">
        <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className="absolute inset-y-0 left-0 z-10 hidden w-12 items-center justify-center bg-gradient-to-r from-background to-transparent opacity-0 transition group-hover/row:opacity-100 md:flex">
          <ChevronLeft className="h-8 w-8 text-primary" />
        </button>
        <div ref={ref} className="scrollbar-none flex scroll-smooth gap-3 overflow-x-auto px-4 pb-4 md:px-8">
          {items.map((i) => (
            <div key={`${i.media_type}-${i.id}`} className="w-32 shrink-0 sm:w-36 md:w-44">
              <MediaCard item={i} />
            </div>
          ))}
        </div>
        <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className="absolute inset-y-0 right-0 z-10 hidden w-12 items-center justify-center bg-gradient-to-l from-background to-transparent opacity-0 transition group-hover/row:opacity-100 md:flex">
          <ChevronRight className="h-8 w-8 text-primary" />
        </button>
      </div>
    </section>
  );
}
