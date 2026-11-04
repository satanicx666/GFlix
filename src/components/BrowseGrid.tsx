import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { MediaCard } from "@/components/MediaCard";
import { AdSlot } from "@/components/AdSlot";
import { discover, getGenres } from "@/lib/browse.functions";
import { COUNTRIES, YEARS } from "@/lib/catalog";

export interface BrowseFilters {
  genre?: string | undefined;
  year?: number | undefined;
  country?: string | undefined;
  page?: number | undefined;
}

export function BrowseGrid({
  type,
  title,
  filters,
  onChange,
}: {
  type: "movie" | "tv";
  title: string;
  filters: BrowseFilters;
  onChange: (f: BrowseFilters) => void;
}) {
  const page = filters.page ?? 1;
  const genres = useQuery({ queryKey: ["genres", type], queryFn: () => getGenres({ data: { type } }), staleTime: Infinity });
  const res = useQuery({
    queryKey: ["discover", type, filters],
    queryFn: () => discover({ data: { type, genre: filters.genre, year: filters.year, country: filters.country, page } }),
    placeholderData: keepPreviousData,
  });
  const sel = "h-9 rounded-full border border-input bg-card px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 md:px-8">
      <h1 className="text-4xl font-bold md:text-5xl">{title}</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <select className={sel} value={filters.genre ?? ""} onChange={(e) => onChange({ ...filters, genre: e.target.value || undefined, page: 1 })}>
          <option value="">All genres</option>
          {genres.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className={sel} value={filters.year ?? ""} onChange={(e) => onChange({ ...filters, year: e.target.value ? Number(e.target.value) : undefined, page: 1 })}>
          <option value="">All years</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className={sel} value={filters.country ?? ""} onChange={(e) => onChange({ ...filters, country: e.target.value || undefined, page: 1 })}>
          <option value="">All countries</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      <AdSlot placement="catalog_top" />
      {res.isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {res.data?.results.length === 0 && <p className="mt-8 text-muted-foreground">No titles match these filters.</p>}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {res.data?.results.map((i) => <MediaCard key={i.id} item={i} />)}
      </div>
      {res.data && res.data.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => onChange({ ...filters, page: page - 1 })}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {res.data.totalPages}</span>
          <Button variant="secondary" disabled={page >= res.data.totalPages} onClick={() => onChange({ ...filters, page: page + 1 })}>Next</Button>
        </div>
      )}
      <AdSlot placement="catalog_bottom" />
    </div>
  );
}
