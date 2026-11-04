import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPartyCode, createPartySchema } from "./party-invite";
import { publicClient } from "./public-client.server";

export const publicParties = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient(process.env["SUPABASE_URL"], process.env["SUPABASE_PUBLISHABLE_KEY"]);
  const { data, error } = await sb.rpc("list_public_watch_parties");
  if (error) throw new Error("Could not load public rooms");
  return data ?? [];
});

export const createParty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createPartySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: code, error } = await context.supabase.rpc("create_watch_party", {
      p_code: createPartyCode(), p_type: data.type, p_tmdb_id: data.tmdbId, p_title: data.title,
      p_season: data.season ?? 1, p_episode: data.episode ?? 1,
      p_visibility: data.visibility, p_pin: data.visibility === "private" ? data.pin ?? "" : "",
      p_name: String(context.claims["email"] ?? "member").split("@")[0]?.slice(0,80) || "member",
    });
    if (error || !code) throw new Error("Could not create room");
    return { code };
  });