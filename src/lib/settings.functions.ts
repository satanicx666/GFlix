import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEFAULT_SETTINGS = {
  site_name: "Layar Emas",
  description: "Discover movies and TV shows, keep a watchlist, and stream licensed titles.",
  keywords: "film, movie, tv, streaming, nonton, film indonesia",
  logo_url: null as string | null,
  favicon_url: null as string | null,
  og_image_url: null as string | null,
  bg_image_url: null as string | null,
  primary_color: null as string | null,
  background_color: null as string | null,
  card_color: null as string | null,
};
export type SiteSettings = typeof DEFAULT_SETTINGS;

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SiteSettings> => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  const { id: _id, updated_at: _u, ...rest } = data;
  return { ...DEFAULT_SETTINGS, ...rest };
});

export const settingsQuery = queryOptions({ queryKey: ["site-settings"], queryFn: () => getSiteSettings(), staleTime: 5 * 60_000 });

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable();
const url = z.string().url().max(2000).nullable();

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        site_name: z.string().min(1).max(60),
        description: z.string().max(300),
        keywords: z.string().max(500),
        logo_url: url,
        favicon_url: url,
        og_image_url: url,
        bg_image_url: url,
        primary_color: hex,
        background_color: hex,
        card_color: hex,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ id: 1, ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_audit_log").insert({ admin_id: context.userId, action: "settings.update", target_id: "site" });
    return { ok: true };
  });

/** CSS overriding theme tokens from admin-chosen colors. */
export function themeCss(s: SiteSettings) {
  const v: string[] = [];
  if (s.primary_color) v.push(`--primary:${s.primary_color};--ring:${s.primary_color};--primary-glow:color-mix(in oklab, ${s.primary_color} 70%, white);--sidebar-primary:${s.primary_color};--chart-1:${s.primary_color}`);
  if (s.background_color) v.push(`--background:${s.background_color};--popover:${s.background_color}`);
  if (s.card_color) v.push(`--card:${s.card_color};--secondary:${s.card_color};--muted:${s.card_color};--border:color-mix(in oklab, ${s.card_color} 80%, white 12%);--input:color-mix(in oklab, ${s.card_color} 80%, white 12%)`);
  return v.length ? `:root{${v.join(";")}}` : "";
}
