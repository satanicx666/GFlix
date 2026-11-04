import { z } from "zod";

// Accept existing invitations as well as new cryptographically random codes.
export const partyCodeSchema = z.string().trim().toUpperCase().regex(/^([A-Z0-9]{6}|[A-F0-9]{32})$/);

export function createPartyCode() {
  return crypto.randomUUID().replaceAll("-", "").toUpperCase();
}

export const createPartySchema = z.object({
  type: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  season: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
  visibility: z.enum(["public", "private"]),
  pin: z.string().optional(),
}).refine((room) => room.visibility !== "private" || /^[0-9]{4,8}$/.test(room.pin ?? ""), { message: "Enter a 4–8 digit PIN", path: ["pin"] });