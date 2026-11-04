import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeAdGroup } from "@/components/AdSlot";
import { MediaRow } from "@/components/MediaCard";
import { ContinueWatching } from "@/components/ContinueWatching";
import { getHome } from "@/lib/tmdb.functions";
import { tmdbImg } from "@/lib/img";
import hero from "@/assets/hero.jpg";
import { settingsQuery } from "@/lib/settings.functions";
import { useQuery } from "@tanstack/react-query";

const homeQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHome(), staleTime: 10 * 60_000 });

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [home, settings] = await Promise.all([
      context.queryClient.ensureQueryData(homeQuery),
      context.queryClient.ensureQueryData(settingsQuery).catch(() => null),
    ]);
    return {
      og: settings?.bg_image_url ?? tmdbImg(home.trending[0]?.backdrop_path, "original") ?? null,
      name: settings?.site_name ?? "Layar Emas",
      desc: settings?.description ?? "Trending movies, TV shows and Indonesian films. Save your watchlist and stream licensed titles.",
    };
  },
  head: ({ loaderData }) => {
    const title = `${loaderData?.name ?? "Layar Emas"} — Discover & stream movies and TV`;
    const desc = loaderData?.desc ?? "Trending movies, TV shows and Indonesian films.";
    const og = loaderData?.og?.startsWith("https://") ? loaderData.og : null;
    return {
      meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(og ? [{ property: "og:image", content: og }, { name: "twitter:image", content: og }] : []),
      ],
    };
  },
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(homeQuery);
  const feat = data.trending[0];
  const { data: s } = useQuery(settingsQuery);
  const bg = s?.bg_image_url ?? tmdbImg(feat?.backdrop_path, "original") ?? hero;

  return (
    <div className="space-y-10 pb-16">
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" width={1920} height={1088} loading="eager" fetchPriority="high" />
        <div className="absolute inset-0 bg-fade-left" />
        <div className="absolute inset-0 bg-fade-bottom" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 md:px-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">Trending this week</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] drop-shadow-lg md:text-6xl">{feat?.title}</h1>
          <p className="mt-4 line-clamp-3 max-w-xl text-muted-foreground">{feat?.overview}</p>
          <div className="mt-6 flex gap-3">
            {feat && (
              <Button asChild variant="hero" size="lg">
                {feat.media_type === "movie" ? (
                  <Link to="/movie/$id" params={{ id: String(feat.id) }}><Info /> View details</Link>
                ) : (
                  <Link to="/tv/$id" params={{ id: String(feat.id) }}><Info /> View details</Link>
                )}
              </Button>
            )}
          </div>
        </div>
      </section>
      <ContinueWatching />
      <HomeAdGroup index={0} />
      <MediaRow title="Trending Now" items={data.trending} />
      <HomeAdGroup index={1} />
      <MediaRow title="Popular movies" items={data.movies} />
      <HomeAdGroup index={2} />
      <MediaRow title="Popular TV" items={data.tv} />
      <HomeAdGroup index={3} />
      <MediaRow title="Film Indonesia" items={data.indo} />
      <HomeAdGroup index={4} />
      <MediaRow title="Top rated" items={data.top} />
      <HomeAdGroup index={5} />
    </div>
  );
}
