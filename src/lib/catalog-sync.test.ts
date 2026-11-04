import { describe, expect, it } from "vitest";
import { exportFile, changesWindow, SYNC_BATCH_SIZE } from "./catalog-sync";
describe("automatic TMDB catalog sync", () => {
  it("imports official movie and TV exports, not a capped discover listing", () => {
    expect(exportFile("movie", "2026-11-01")).toBe("movie_ids_11_01_2026.json.gz");
    expect(exportFile("tv", "2026-11-01")).toBe("tv_series_ids_11_01_2026.json.gz");
  });
  it("keeps change polling inside TMDB's 14-day window", () => {
    expect(changesWindow("2026-01-01", "2026-11-01")).toEqual({ start_date: "2026-10-19", end_date: "2026-11-01" });
  });
  it("keeps detail requests below the outbound connection limit", () => {
    expect(SYNC_BATCH_SIZE).toBe(4);
    expect(SYNC_BATCH_SIZE).toBeLessThanOrEqual(6);
  });
});