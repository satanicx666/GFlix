import { useQuery } from "@tanstack/react-query";
import { adsQuery } from "@/lib/advertisements.functions";
import { adsForPlacement, adGroupPlacements, HOME_AD_GROUPS, type Advertisement, type AdPlacement } from "@/lib/advertisements";

export function AdCreative({ ad, preview = false }: { ad: Advertisement; preview?: boolean }) {
  const creative = <div className="flex min-h-24 w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-card text-center">
    <span className="px-3 py-1 text-[10px] uppercase text-muted-foreground">Advertisement</span>
    {ad.image_url && <img src={ad.image_url} alt={ad.headline || ad.name} className="max-h-64 w-full object-contain" />}
    {ad.headline && <p className="max-w-full break-words px-5 py-4 font-display text-xl font-semibold text-foreground">{ad.headline}</p>}
  </div>;
  return ad.target_url && !preview ? <a href={ad.target_url} target="_blank" rel="noopener noreferrer sponsored" className="block" aria-label={ad.headline || ad.name}>{creative}</a> : creative;
}

function SingleAdSlot({ placement, compact = false }: { placement: AdPlacement; compact?: boolean }) {
  const { data = [] } = useQuery(adsQuery);
  const ads = adsForPlacement(data, placement);
  if (!ads.length) return null;
  return <aside aria-label={`Advertisements ${placement}`} className={compact ? "min-w-0 space-y-3" : "mx-auto w-full max-w-7xl space-y-3 px-4 py-4 md:px-8"}>
    {ads.map((ad) => <AdCreative key={ad.id} ad={ad} />)}
  </aside>;
}

export function AdSlot({ placement, compact = false }: { placement: AdPlacement; compact?: boolean }) {
  const { data = [] } = useQuery(adsQuery);
  const placements = adGroupPlacements(placement).filter((slot) => adsForPlacement(data, slot).length);
  if (!placements.length) return null;
  return <div className={`grid w-full gap-4 ${compact ? "" : "mx-auto max-w-7xl px-4 py-4 md:px-8"} ${placements.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
    {placements.map((slot) => <SingleAdSlot key={slot} placement={slot} compact />)}
  </div>;
}

export function HomeAdGroup({ index }: { index: number }) {
  const { data = [] } = useQuery(adsQuery);
  const group = HOME_AD_GROUPS[index];
  const placements = group?.placements.filter((placement) => adsForPlacement(data, placement).length) ?? [];
  if (!placements.length) return null;
  return <div className={`mx-auto grid w-full max-w-7xl gap-4 px-4 md:px-8 ${placements.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
    {placements.map((placement) => <AdSlot key={placement} placement={placement} compact />)}
  </div>;
}