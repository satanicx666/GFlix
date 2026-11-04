import { describe, expect, it } from "vitest";
import { adsForPlacement, advertisementSchema, EMPTY_AD, HOME_AD_GROUPS, AD_PLACEMENTS, adGroupPlacements } from "./advertisements";

describe("admin-managed advertisements", () => {
  it("only displays active advertisements in their saved placement", () => {
    const ads = [
      { ...EMPTY_AD, name: "Top", headline: "A", placement: "watch_top" as const, is_active: true },
      { ...EMPTY_AD, name: "Hidden", headline: "B", placement: "watch_top" as const },
      { ...EMPTY_AD, name: "Home", headline: "C", is_active: true },
    ];
    expect(adsForPlacement(ads, "watch_top").map((ad) => ad.name)).toEqual(["Top"]);
    expect(adsForPlacement(ads, "home").map((ad) => ad.name)).toEqual(["Home"]);
  });
  it("accepts each supported admin placement", () => {
    for (const { value: placement } of AD_PLACEMENTS) {
      expect(advertisementSchema.safeParse({ ...EMPTY_AD, name: "Ad", headline: "Sponsor", placement }).success).toBe(true);
    }
    expect(advertisementSchema.safeParse({ ...EMPTY_AD, name: "Ad", headline: "Sponsor", placement: "unknown" }).success).toBe(false);
  });
  it("provides exactly 10 independent home positions", () => {
    const positions = HOME_AD_GROUPS.flatMap((group) => [...group.placements]);
    expect(positions).toHaveLength(10);
    expect(new Set(positions).size).toBe(10);
    for (const placement of positions) {
      expect(advertisementSchema.safeParse({ ...EMPTY_AD, name: "Home sponsor", headline: "Sponsor", placement }).success).toBe(true);
      const ad = { ...EMPTY_AD, name: placement, headline: "Sponsor", placement, is_active: true };
      for (const target of positions) expect(adsForPlacement([ad], target)).toHaveLength(target === placement ? 1 : 0);
    }
  });
  it.each(["home_middle", "home_bottom", "details_bottom", "catalog_top", "catalog_bottom", "search_top", "search_bottom", "watch_episodes", "watch_recommendations", "party_top", "party_bottom"] as const)("keeps %s advertisements separate from other placements", (placement) => {
    const ad = { ...EMPTY_AD, name: "Extra slot", headline: "Sponsor", placement, is_active: true };
    expect(adsForPlacement([ad, { ...ad, is_active: false }, { ...ad, placement: "home" }], placement)).toEqual([ad]);
  });
  it("rejects script links and empty creatives", () => {
    expect(advertisementSchema.safeParse({ ...EMPTY_AD, name: "Ad", headline: "Sponsor", target_url: "javascript:alert(1)" }).success).toBe(false);
    expect(advertisementSchema.safeParse({ ...EMPTY_AD, name: "Ad" }).success).toBe(false);
  });
  it.each(["catalog", "search", "party", "party_directory", "collection", "watchlist", "browse"] as const)("provides six separate %s positions", (page) => {
    const placements = [...adGroupPlacements(`${page}_top`), ...adGroupPlacements(`${page}_bottom`)];
    expect(placements).toHaveLength(6);
    expect(new Set(placements).size).toBe(6);
    for (const placement of placements) expect(advertisementSchema.safeParse({ ...EMPTY_AD, name: "Sponsor", headline: "Sponsor", placement }).success).toBe(true);
  });
});