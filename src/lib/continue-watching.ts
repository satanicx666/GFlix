export interface ContinueEntry {
  key: string;
  type: "movie" | "tv";
  id: number;
  title: string;
  backdrop: string | null;
  poster: string | null;
  season?: number | undefined;
  episode?: number | undefined;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

const STORAGE_KEY = "layar-continue-watching";
const MAX = 20;
export const entryKey = (type: string, id: number) => `${type}-${id}`;

/** Fraction watched (0..1). */
export const progressOf = (e: Pick<ContinueEntry, "currentTime" | "duration">) =>
  e.duration > 0 ? Math.min(1, Math.max(0, e.currentTime / e.duration)) : 0;

/** Entries shown on home: opened and not finished (< 95%). */
export const isResumable = (e: ContinueEntry) => progressOf(e) < 0.95;

/** Merge an update into the list: newest first, capped, finished items dropped. */
export function upsertEntry(list: ContinueEntry[], entry: ContinueEntry): ContinueEntry[] {
  const rest = list.filter((e) => e.key !== entry.key);
  if (entry.duration > 0 && progressOf(entry) >= 0.95) return rest;
  return [entry, ...rest].slice(0, MAX);
}

/** Parses a Vidy-style postMessage payload (JSON string with PLAYER_EVENT data). */
export function parsePlayerMessage(data: unknown): { event: string; currentTime: number; duration: number } | null {
  if (typeof data !== "string") return null;
  try {
    const p = JSON.parse(data);
    const inner = p?.type === "PLAYER_EVENT" && p.data && typeof p.data === "object" ? p.data : p;
    if (typeof inner?.event !== "string") return null;
    const currentTime = Number(inner.currentTime), duration = Number(inner.duration);
    if (!Number.isFinite(currentTime) || currentTime < 0) return null;
    return { event: inner.event, currentTime, duration: Number.isFinite(duration) && duration > 0 ? duration : 0 };
  } catch {
    return null;
  }
}

/** Adds ?progress= for Vidy embeds so playback resumes. */
export function withResume(url: string, seconds: number | undefined) {
  if (!seconds || seconds < 30) return url;
  try {
    const u = new URL(url);
    if (!/(^|\.)vidy\.st$/.test(u.hostname)) return url;
    u.searchParams.set("progress", String(Math.floor(seconds)));
    return u.toString();
  } catch {
    return url;
  }
}

export function readEntries(): ContinueEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function saveEntry(entry: ContinueEntry) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(upsertEntry(readEntries(), entry)));
  window.dispatchEvent(new Event("continue-watching"));
}

export function removeEntry(key: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readEntries().filter((e) => e.key !== key)));
  window.dispatchEvent(new Event("continue-watching"));
}
