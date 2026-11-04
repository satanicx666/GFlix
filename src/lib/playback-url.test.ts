import { describe, expect, it } from "vitest";
import { nxshaPlaybackUrl, embedPlaybackUrl, embedTemplatesSchema, saveEmbedTemplatesSchema, DEFAULT_EMBED_TEMPLATES } from "./playback-url";

describe("authorized nxsha playback", () => {
  it("uses the movie endpoint with the TMDB ID", () => {
    expect(nxshaPlaybackUrl({ type: "movie", id: 862 })).toBe("https://nxsha.space/embed/movie/862");
  });
  it("uses the TV endpoint with the selected season and episode", () => {
    expect(nxshaPlaybackUrl({ type: "tv", id: 1399, s: 2, e: 3 })).toBe("https://nxsha.space/embed/tv/1399/2/3");
  });
  it("defaults TV playback to season 1 episode 1", () => {
    expect(nxshaPlaybackUrl({ type: "tv", id: 1399 })).toBe("https://nxsha.space/embed/tv/1399/1/1");
  });
  it("rejects invalid IDs and episode coordinates", () => {
    expect(() => nxshaPlaybackUrl({ type: "movie", id: -1 })).toThrow();
    expect(() => nxshaPlaybackUrl({ type: "tv", id: 1399, s: 0, e: 1 })).toThrow();
    expect(() => nxshaPlaybackUrl({ type: "tv", id: 1399, s: 1, e: 1.5 })).toThrow();
  });
});

describe("admin embed settings", () => {
  it("uses saved movie and TV prefixes with selected coordinates", () => {
    const templates = { movie_embed_template: "https://nxsha.space/custom/movie/{id}?autoplay=1", tv_embed_template: "https://nxsha.space/custom/tv/{id}/{season}/{episode}" };
    expect(embedPlaybackUrl({ type: "movie", id: 862 }, templates)).toBe("https://nxsha.space/custom/movie/862?autoplay=1");
    expect(embedPlaybackUrl({ type: "tv", id: 1399, s: 2, e: 3 }, templates)).toBe("https://nxsha.space/custom/tv/1399/2/3");
    expect(embedPlaybackUrl({ type: "tv", id: 1399 }, templates)).toBe("https://nxsha.space/custom/tv/1399/1/1");
  });
  it("requires explicit permission confirmation when saving", () => {
    expect(saveEmbedTemplatesSchema.safeParse({ ...DEFAULT_EMBED_TEMPLATES, rights_confirmed: false }).success).toBe(false);
    expect(saveEmbedTemplatesSchema.safeParse({ ...DEFAULT_EMBED_TEMPLATES, rights_confirmed: true }).success).toBe(true);
  });
  it("rejects unsafe or incomplete templates", () => {
    for (const url of ["http://nxsha.space/{id}", "https://vidsrc.to/{id}", "https://user:pass@nxsha.space/{id}", "https://127.0.0.1/{id}", "https://nxsha.space/no-id", "https://nxsha.space/{unknown}/{id}", "https://{id}.space/movie/1"]) {
      expect(embedTemplatesSchema.safeParse({ ...DEFAULT_EMBED_TEMPLATES, movie_embed_template: url }).success).toBe(false);
    }
    expect(embedTemplatesSchema.safeParse({ ...DEFAULT_EMBED_TEMPLATES, tv_embed_template: "https://nxsha.space/{id}" }).success).toBe(false);
  });
});