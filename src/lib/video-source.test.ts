import { describe, expect, it } from "vitest";
import { validEmbedUrl } from "./video-source";

describe("licensed embed URLs", () => {
  it("accepts an HTTPS owner-hosted embed", () => {
    expect(validEmbedUrl("https://video.example.org/embed/film-123")).toBe(true);
  });
  it("rejects executable and insecure URLs", () => {
    expect(validEmbedUrl("javascript:alert(1)")).toBe(false);
    expect(validEmbedUrl("http://video.example.org/embed/123")).toBe(false);
  });
  it("does not allow the excluded piracy embed hosts", () => {
    for (const host of ["vidsrc.to", "2embed.cc", "vidfast.pro", "nontongo.win"]) {
      expect(validEmbedUrl(`https://${host}/embed/123`)).toBe(false);
    }
  });
});