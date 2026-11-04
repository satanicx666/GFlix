import { describe, expect, it } from "vitest";
import { canWatch, canUseServer } from "@/lib/viewing";

describe("free public viewing", () => {
  it("guests can watch without a profile", () => {
    expect(canWatch(null)).toBe(true);
  });
  it("members can watch but banned signed-in accounts cannot", () => {
    expect(canWatch({ is_banned: false })).toBe(true);
    expect(canWatch({ is_banned: true })).toBe(false);
  });
  it("all active servers are available without a premium tier", () => {
    expect(canUseServer({ is_active: true })).toBe(true);
    expect(canUseServer({ is_active: false })).toBe(false);
  });
});