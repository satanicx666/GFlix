import { z } from "zod";

const excludedHosts = ["vidsrc", "2embed", "vidfast", "nontongo"];

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const octets = host.split(".").map(Number);
    const first = octets[0] ?? 0;
    const second = octets[1] ?? 0;
    if (first === 10) return true;
    if (first === 127) return true;
    if (first === 169 && second === 254) return true;
    if (first === 192 && second === 168) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 0) return true;
  }
  if (host === "::1") return true;
  return false;
}

export function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      url.hostname.includes(".") && !isPrivateHostname(url.hostname);
  } catch {
    return false;
  }
}

export function resolveSourceUrl(path: string, base: string) {
  try {
    const url = new URL(path, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (isPrivateHostname(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
export function validEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      !excludedHosts.some((host) => url.hostname.split(".").includes(host)) &&
      !isPrivateHostname(url.hostname);
  } catch { return false; }
}

export const videoSourceSchema = z.object({
  tmdb_id: z.number().int().positive(),
  media_type: z.enum(["movie", "tv"]),
  season: z.number().int().positive().nullable(),
  episode: z.number().int().positive().nullable(),
  server_id: z.string().uuid(),
  path: z.string().trim().min(1).max(1000),
  quality: z.string().max(20),
  title: z.string().max(200).nullable(),
  source_type: z.enum(["video", "embed"]).default("video"),
}).superRefine((value, ctx) => {
  if (value.source_type === "embed") {
    if (!validEmbedUrl(value.path)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["path"], message: "Use a licensed HTTPS embed URL from your own host" });
    }
    return;
  }
  if (/[a-z][a-z0-9+.-]*:/i.test(value.path) || value.path.startsWith("//") || value.path.includes("\\") || value.path.split("/").some((part) => part === "..")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["path"], message: "Use a relative path on the selected server" });
  }
});