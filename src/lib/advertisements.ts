import { z } from "zod";

const BASE_AD_PLACEMENTS = [
  { value: "home", label: "Home · 01 · below featured title, left" },
  { value: "home_featured_extra", label: "Home · 02 · below featured title, right" },
  { value: "home_trending", label: "Home · 03 · after trending, left" },
  { value: "home_trending_extra", label: "Home · 04 · after trending, right" },
  { value: "home_middle", label: "Home · 05 · after popular movies, left" },
  { value: "home_movies_extra", label: "Home · 06 · after popular movies, right" },
  { value: "home_tv", label: "Home · 07 · after popular TV" },
  { value: "home_indo", label: "Home · 08 · after Film Indonesia" },
  { value: "home_bottom", label: "Home · 09 · after top rated, left" },
  { value: "home_bottom_extra", label: "Home · 10 · after top rated, right" },
  { value: "details", label: "Film / TV details · below title" },
  { value: "details_bottom", label: "Film / TV details · before similar titles" },
  { value: "catalog_top", label: "Movies / TV catalog · above results" },
  { value: "catalog_bottom", label: "Movies / TV catalog · below results" },
  { value: "search_top", label: "Search · above results" },
  { value: "search_bottom", label: "Search · below results" },
  { value: "watch_top", label: "Watch · above player" },
  { value: "watch_bottom", label: "Watch · below player" },
  { value: "watch_episodes", label: "Watch TV · before episode list" },
  { value: "watch_recommendations", label: "Watch movie · before recommendations" },
  { value: "party_top", label: "Watch Party · above player" },
  { value: "party_bottom", label: "Watch Party · below player" },
  { value: "party_directory_top", label: "Watch Party lobby · above public rooms" },
  { value: "party_directory_bottom", label: "Watch Party lobby · below public rooms" },
  { value: "collection_top", label: "Collections · above titles" },
  { value: "collection_bottom", label: "Collections · below titles" },
  { value: "watchlist_top", label: "Watchlist · above saved titles" },
  { value: "watchlist_bottom", label: "Watchlist · below saved titles" },
  { value: "browse_top", label: "Genre / year / country · above choices" },
  { value: "browse_bottom", label: "Genre / year / country · below choices" },
  { value: "preroll", label: "Watch · before playback" },
  { value: "footer", label: "All public pages · above footer" },
] as const;

const EXTRA_PLACEMENT_BASES = ["details", "details_bottom", "catalog_top", "catalog_bottom", "search_top", "search_bottom", "watch_top", "watch_bottom", "watch_episodes", "watch_recommendations", "party_top", "party_bottom", "party_directory_top", "party_directory_bottom", "collection_top", "collection_bottom", "watchlist_top", "watchlist_bottom", "browse_top", "browse_bottom"] as const;
export const AD_PLACEMENTS = [
  ...BASE_AD_PLACEMENTS,
  ...EXTRA_PLACEMENT_BASES.flatMap((base) => ([2, 3] as const).map((n) => ({ value: `${base}_${n}` as `${typeof base}_${typeof n}`, label: `${BASE_AD_PLACEMENTS.find((item) => item.value === base)?.label} · position ${n}` }))),
] as const;

export const HOME_AD_GROUPS = [
  { title: "Featured film", placements: ["home", "home_featured_extra"] },
  { title: "Trending", placements: ["home_trending", "home_trending_extra"] },
  { title: "Popular movies", placements: ["home_middle", "home_movies_extra"] },
  { title: "Popular TV", placements: ["home_tv"] },
  { title: "Film Indonesia", placements: ["home_indo"] },
  { title: "Top rated", placements: ["home_bottom", "home_bottom_extra"] },
] as const;

const httpsUrl = z.string().max(2000).refine((value) => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}, "Use an HTTPS URL").nullable();

export const advertisementSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  headline: z.string().trim().max(160),
  image_url: httpsUrl,
  target_url: httpsUrl,
  placement: z.enum([AD_PLACEMENTS[0].value, ...AD_PLACEMENTS.slice(1).map((placement) => placement.value)]),
  is_active: z.boolean(),
  sort_order: z.number().int(),
  duration_seconds: z.number().int().min(1).max(30),
}).refine((ad) => Boolean(ad.image_url || ad.headline), { message: "Add an image or headline", path: ["headline"] });

export type Advertisement = z.infer<typeof advertisementSchema>;
export type AdPlacement = Advertisement["placement"];
export function adGroupPlacements(placement: AdPlacement): AdPlacement[] {
  if (!EXTRA_PLACEMENT_BASES.some((base) => base === placement)) return [placement];
  return AD_PLACEMENTS.filter((item) => item.value === placement || item.value === `${placement}_2` || item.value === `${placement}_3`).map((item) => item.value);
}
export const EMPTY_AD: Advertisement = { name: "", headline: "", image_url: null, target_url: null, placement: "home", is_active: false, sort_order: 0, duration_seconds: 5 };

export function adsForPlacement<T extends Advertisement>(ads: T[], placement: AdPlacement) {
  return ads.filter((ad) => ad.is_active && ad.placement === placement).sort((a, b) => a.sort_order - b.sort_order);
}