import { z } from "zod";
import { validEmbedUrl } from "./video-source";

export const DEFAULT_EMBED_TEMPLATES = {
  movie_embed_template: "https://nxsha.space/embed/movie/{id}",
  tv_embed_template: "https://nxsha.space/embed/tv/{id}/{season}/{episode}",
};

function validTemplate(value: string, type: "movie" | "tv") {
  const required = type === "movie" ? ["id"] : ["id", "season", "episode"];
  const tokens = [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1] ?? "");
  if (!required.every((token) => tokens.includes(token)) || tokens.some((token) => !required.includes(token))) return false;
  const resolved = value.replace(/\{(id|season|episode)\}/g, "1");
  if (/[{}]/.test(resolved) || !validEmbedUrl(resolved)) return false;
  const url = new URL(resolved);
  return !/[{}]/.test(value.split("/").slice(0, 3).join("/")) &&
    url.hostname.includes(".") && !url.hostname.endsWith(".local") && !url.hostname.endsWith(".localhost") &&
    !url.hostname.includes(":") && !/^\d+(\.\d+){3}$/.test(url.hostname);
}

export const embedTemplatesSchema = z.object({
  movie_embed_template: z.string().trim().max(2000).refine((v) => validTemplate(v, "movie"), "Use an authorized HTTPS movie URL containing {id}"),
  tv_embed_template: z.string().trim().max(2000).refine((v) => validTemplate(v, "tv"), "Use an authorized HTTPS TV URL containing {id}, {season}, and {episode}"),
});
export type EmbedTemplates = z.infer<typeof embedTemplatesSchema>;
export const saveEmbedTemplatesSchema = embedTemplatesSchema.extend({
  rights_confirmed: z.literal(true, { errorMap: () => ({ message: "Confirm permission to show these sources" }) }),
});

export const playbackInputSchema = z.object({
  type: z.enum(["movie", "tv"]),
  id: z.number().int().positive(),
  s: z.number().int().positive().optional(),
  e: z.number().int().positive().optional(),
});

export function nxshaPlaybackUrl(input: z.infer<typeof playbackInputSchema>) {
  return embedPlaybackUrl(input, DEFAULT_EMBED_TEMPLATES);
}

export function embedPlaybackUrl(input: z.infer<typeof playbackInputSchema>, templates: EmbedTemplates) {
  const data = playbackInputSchema.parse(input);
  const parsed = embedTemplatesSchema.parse(templates);
  const template = data.type === "movie" ? parsed.movie_embed_template : parsed.tv_embed_template;
  return template.replaceAll("{id}", String(data.id)).replaceAll("{season}", String(data.s ?? 1)).replaceAll("{episode}", String(data.e ?? 1));
}