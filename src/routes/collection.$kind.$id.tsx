import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCollection } from "@/lib/browse.functions";
import { MediaCard } from "@/components/MediaCard";
import { AdSlot } from "@/components/AdSlot";
import { tmdbImg } from "@/lib/img";

const q = (kind: "collection" | "company", id: number) =>
  queryOptions({ queryKey: ["collection", kind, id], queryFn: () => getCollection({ data: { kind, id } }) });
const kindOf = (k: string) => (k === "company" ? "company" : "collection");

export const Route = createFileRoute("/collection/$kind/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(q(kindOf(params.kind), Number(params.id))),
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.name} — Layar Emas` : "Collection — Layar Emas";
    const d = loaderData?.overview?.slice(0, 160) || `All titles from ${loaderData?.name ?? "this collection"}.`;
    const img = tmdbImg(loaderData?.backdrop_path, "w780");
    return {
      meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  errorComponent: () => <p className="px-8 pt-32 text-muted-foreground">This collection could not be loaded.</p>,
  component: Page,
});

function Page() {
  const { kind, id } = Route.useParams();
  const { data } = useSuspenseQuery(q(kindOf(kind), Number(id)));
  const bg = tmdbImg(data.backdrop_path, "original");
  return (
    <div className="pb-16">
      <div className="relative flex min-h-[50vh] items-end overflow-hidden">
        {bg && <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
        <div className="absolute inset-0 bg-fade-bottom" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 md:px-8">
          <h1 className="text-5xl font-bold md:text-6xl">{data.name}</h1>
          {data.overview && <p className="mt-3 max-w-2xl text-muted-foreground">{data.overview}</p>}
          <p className="mt-2 text-sm text-primary">{data.items.length} titles</p>
        </div>
      </div>
      <AdSlot placement="collection_top" />
      <div className="mx-auto mt-6 grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-3 md:grid-cols-5 md:px-8 lg:grid-cols-6">
        {data.items.map((i) => <MediaCard key={i.id} item={i} />)}
      </div>
      <AdSlot placement="collection_bottom" />
    </div>
  );
}
