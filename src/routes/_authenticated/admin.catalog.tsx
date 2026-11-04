import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importCatalogTitle, listCatalog } from "@/lib/admin.functions";
import { tmdbImg } from "@/lib/img";

export const Route = createFileRoute("/_authenticated/admin/catalog")({
  head: () => ({ meta: [
    { title: "Admin film catalog — Layar Emas" },
    { name: "description", content: "Saved movie and TV metadata and licensed video connections." },
    { property: "og:title", content: "Admin film catalog — Layar Emas" },
    { property: "og:description", content: "Saved movie and TV metadata and licensed video connections." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Catalog,
});

function Catalog() {
  const queryClient = useQueryClient();
  const fetch = useServerFn(listCatalog);
  const save = useServerFn(importCatalogTitle);
  const catalog = useQuery({ queryKey: ["admin-catalog"], queryFn: () => fetch() });
  const [search, setSearch] = useState("");
  const [id, setId] = useState("");
  const [type, setType] = useState<"movie" | "tv">("movie");
  const [busy, setBusy] = useState(false);
  const items = catalog.data?.filter((c) => `${c.title} ${c.tmdb_id}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-4xl font-bold">Film catalog</h1>
      <span className="text-sm text-muted-foreground">{catalog.data?.length ?? 0} saved titles</span>
    </div>
    <form className="flex flex-wrap gap-2" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true);
      try {
        const result = await save({ data: { type, id: Number(id) } });
        toast.success(`${result.title} saved`); setId("");
        await queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });
      } catch (error) { toast.error((error as Error).message); }
      finally { setBusy(false); }
    }}>
      <Input type="number" min="1" placeholder="TMDB ID" aria-label="TMDB ID" value={id} onChange={(e) => setId(e.target.value)} required className="w-44" />
      <select aria-label="Media type" value={type} onChange={(e) => setType(e.target.value === "tv" ? "tv" : "movie")} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="movie">Movie</option><option value="tv">TV show</option></select>
      <Button disabled={busy} type="submit"><Plus />{busy ? "Saving…" : "Import title"}</Button>
    </form>
    <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search saved titles" placeholder="Search saved titles" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
    {catalog.isLoading && <p className="text-muted-foreground">Loading catalog…</p>}
    {catalog.error && <p className="text-destructive">{catalog.error.message}</p>}
    <div className="divide-y divide-border">
      {items?.map((item) => <div key={item.id} className="flex items-center gap-4 py-4">
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-card">{item.poster_path && <img src={tmdbImg(item.poster_path, "w342") ?? ""} alt={item.title} className="h-full w-full object-cover" loading="lazy" />}</div>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{item.title}</h2><p className="text-xs text-muted-foreground">{item.media_type} · {item.release_date?.slice(0, 4) || "—"} · TMDB {item.tmdb_id} · {item.licensed_videos.length} video sources</p><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.overview}</p></div>
        <Button asChild size="sm" variant="secondary"><Link to="/admin/videos" search={{ tmdb: item.tmdb_id, type: item.media_type === "tv" ? "tv" : "movie" }}><Plus /><span className="hidden sm:inline">Add video</span></Link></Button>
      </div>)}
    </div>
    {items?.length === 0 && <p className="text-muted-foreground">No saved titles.</p>}
  </div>;
}