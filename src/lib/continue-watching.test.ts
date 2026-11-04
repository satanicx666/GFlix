import { describe, expect, it } from "vitest";
import { isResumable, parsePlayerMessage, upsertEntry, withResume, type ContinueEntry } from "./continue-watching";

const e = (o: Partial<ContinueEntry>): ContinueEntry => ({ key: "movie-1", type: "movie", id: 1, title: "A", backdrop: null, poster: null, currentTime: 100, duration: 1000, updatedAt: 1, ...o });

describe("continue watching", () => {
  it("parses timeupdate messages", () => {
    expect(parsePlayerMessage(JSON.stringify({ type: "PLAYER_EVENT", data: { event: "timeupdate", currentTime: 42, duration: 100 } }))).toEqual({ event: "timeupdate", currentTime: 42, duration: 100 });
    expect(parsePlayerMessage(JSON.stringify({ event: "pause", currentTime: 5, duration: 10 }))?.event).toBe("pause");
    expect(parsePlayerMessage({ event: "timeupdate" })).toBeNull();
  });
  it("drops finished titles and moves updates to the front", () => {
    const list = [e({ key: "a" }), e({ key: "b" })];
    expect(upsertEntry(list, e({ key: "b", currentTime: 200 })).map((x) => x.key)).toEqual(["b", "a"]);
    expect(upsertEntry(list, e({ key: "a", currentTime: 960 })).map((x) => x.key)).toEqual(["b"]);
  });
  it("shows opened titles until 95% watched", () => {
    expect(isResumable(e({ currentTime: 0, duration: 0 }))).toBe(true);
    expect(isResumable(e({ currentTime: 960, duration: 1000 }))).toBe(false);
  });
  it("adds progress only to vidy embeds", () => {
    expect(withResume("https://vidy.st/movie/1?color=F5C518", 95.7)).toBe("https://vidy.st/movie/1?color=F5C518&progress=95");
    expect(withResume("https://nxsha.space/embed/movie/1", 95)).toBe("https://nxsha.space/embed/movie/1");
  });
});
