import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrailerKey, type MediaItem } from "@/lib/tmdb.functions";
import { tmdbImg } from "@/lib/img";
import hero from "@/assets/hero.jpg";

const SLIDE_MS = 10000;
const TRAILER_DELAY_MS = 3500;
const HERO_SLIDES = 5;

function FallbackHero() {
  return (
    <section className="relative flex min-h-[70vh] items-end overflow-hidden">
      <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-fade-left" />
      <div className="absolute inset-0 bg-fade-bottom" />
    </section>
  );
}

/** Auto-advancing hero carousel. After a few seconds on a slide, its trailer
 *  autoplays (muted) behind the title, description and "Watch now" button,
 *  which stay visible the whole time. */
export function HeroCarousel({ items }: { items: MediaItem[] }) {
  const slides = items.filter((i) => i.backdrop_path).slice(0, HERO_SLIDES);
  const [index, setIndex] = useState(0);
  const [trailerOn, setTrailerOn] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  // Only slide images that are visible or about to be visible are downloaded.
  const [shown, setShown] = useState<number[]>([0, 1]);
  const active = slides[index];

  const trailerKey =
    useQuery({
      queryKey: ["hero-trailer", active?.media_type ?? "", active?.id ?? 0],
      enabled: !!active && trailerOn,
      staleTime: Infinity,
      gcTime: Infinity,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      queryFn: () => getTrailerKey({ data: { type: active!.media_type, id: active!.id } }),
    }).data ?? null;

  useEffect(() => {
    setTrailerOn(false);
    setVideoReady(false);
    setShown((s) => Array.from(new Set([...s, index, (index + 1) % slides.length])));
    if (slides.length < 2) return;
    const t = setTimeout(() => setTrailerOn(true), TRAILER_DELAY_MS);
    const next = setTimeout(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => {
      clearTimeout(t);
      clearTimeout(next);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slides.length]);

  if (!slides.length || !active) return <FallbackHero />;

  return (
    <section className="relative min-h-[78vh] overflow-hidden bg-background md:min-h-[85vh]">
      {slides.map((s, i) => (
        <div
          key={`${s.media_type}-${s.id}`}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {shown.includes(i) && (
            <img
              src={tmdbImg(s.backdrop_path, "w1280") ?? ""}
              alt=""
              decoding="async"
              fetchPriority={i === 0 && index === 0 ? "high" : undefined}
              className="absolute inset-0 h-full w-full object-cover opacity-80"
            />
          )}
          {i === index && trailerOn && trailerKey && (
            <div className="absolute inset-0 overflow-hidden">
              <iframe
                key={trailerKey}
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${trailerKey}&playsinline=1&rel=0&iv_load_policy=3`}
                allow="autoplay; encrypted-media; fullscreen"
                title={`${s.title} trailer`}
                onLoad={() => setVideoReady(true)}
                className={`absolute left-1/2 top-1/2 h-[56.25vw] w-[177.78vh] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 transition-opacity duration-1000 ${videoReady ? "opacity-100" : "opacity-0"}`}
              />
            </div>
          )}
        </div>
      ))}
      <div className="absolute inset-0 bg-fade-left" />
      <div className="absolute inset-0 bg-fade-bottom" />

      <div className="relative mx-auto flex min-h-[78vh] w-full max-w-7xl items-end px-4 pb-20 md:min-h-[85vh] md:px-8">
        <div key={`${active.media_type}-${active.id}`} className="max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">Trending this week</p>
          <h1 className="text-4xl font-extrabold leading-[1.05] drop-shadow-lg md:text-6xl">{active.title}</h1>
          <p className="mt-4 line-clamp-3 max-w-xl text-muted-foreground drop-shadow">{active.overview}</p>
          <div className="mt-6 flex gap-3">
            <Button asChild variant="hero" size="lg">
              {active.media_type === "movie" ? (
                <Link to="/movie/$id" params={{ id: String(active.id) }}>
                  <Play className="fill-current" /> Watch now
                </Link>
              ) : (
                <Link to="/tv/$id" params={{ id: String(active.id) }}>
                  <Play className="fill-current" /> Watch now
                </Link>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-4 flex gap-2 md:right-8">
        {slides.map((s, i) => (
          <button
            key={`${s.media_type}-${s.id}`}
            type="button"
            aria-label={`Show ${s.title}`}
            onClick={() => setIndex(i)}
            className="relative h-1 w-10 overflow-hidden rounded-full bg-white/25"
          >
            {i === index && (
              <span
                key={index}
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ animation: `hero-progress ${SLIDE_MS}ms linear forwards` }}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
