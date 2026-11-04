import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getDetails } from "@/lib/tmdb.functions";
import { DetailsView } from "@/components/DetailsView";
import { tmdbImg } from "@/lib/img";

const q = (id: number) => queryOptions({ queryKey: ["details", "movie", id], queryFn: () => getDetails({ data: { type: "movie", id } }) });

export const Route = createFileRoute("/movie/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(q(Number(params.id))),
  head: ({ loaderData }) => {
    const img = tmdbImg(loaderData?.backdrop_path, "w780");
    const title = loaderData ? `${loaderData.title} — Layar Emas` : "Movie — Layar Emas";
    const desc = loaderData?.overview?.slice(0, 160) || "Movie details";
    return {
      meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  component: () => {
    const { id } = Route.useParams();
    const { data } = useSuspenseQuery(q(Number(id)));
    return <DetailsView d={data} />;
  },
});
