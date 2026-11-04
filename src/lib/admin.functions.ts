import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { advertisementSchema } from "./advertisements";
import { getDetails } from "@/lib/tmdb.functions";
import { videoSourceSchema, isPublicHttpUrl } from "@/lib/video-source";
import { DEFAULT_EMBED_TEMPLATES, saveEmbedTemplatesSchema } from "./playback-url";

export const getEmbedSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("site_settings").select("movie_embed_template, tv_embed_template").eq("id", 1).maybeSingle();
    if (error) throw new Error("Could not load embed settings");
    return data ?? DEFAULT_EMBED_TEMPLATES;
  });

export const saveEmbedSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saveEmbedTemplatesSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { rights_confirmed: _confirmed, ...templates } = data;
    const { error } = await context.supabase.from("site_settings").upsert({ id: 1, ...templates, updated_at: new Date().toISOString() });
    if (error) throw new Error("Could not save embed settings");
    await audit(context, "embed.settings.update", "site");
    return { ok: true };
  });

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
  const { data: profile } = await ctx.supabase.from("profiles").select("is_banned").eq("id", ctx.userId).maybeSingle();
  if (profile?.is_banned) throw new Error("Your account is suspended.");
}
async function audit(ctx: Ctx, action: string, target?: string) {
  await ctx.supabase.from("admin_audit_log").insert({ admin_id: ctx.userId, action, target_id: target ?? null });
}

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const [users, servers, videos, ads, log] = await Promise.all([
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("server_config").select("id, is_active"),
      sb.from("licensed_videos").select("id", { count: "exact", head: true }),
      sb.from("advertisements").select("id", { count: "exact", head: true }).eq("is_active", true),
      sb.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(15),
    ]);
    return {
      users: users.count ?? 0,
      ads: ads.count ?? 0,
      serversActive: (servers.data ?? []).filter((s) => s.is_active).length,
      serversTotal: (servers.data ?? []).length,
      videos: videos.count ?? 0,
      log: log.data ?? [],
    };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    return (profiles ?? []).map((p) => ({
      ...p,
      isAdmin: (roles ?? []).some((r) => r.user_id === p.id && r.role === "admin"),
    }));
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        banned: z.boolean().optional(),
        admin: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    if (data.banned !== undefined) {
      await sb.from("profiles").update({ is_banned: data.banned }).eq("id", data.id);
      await audit(context, data.banned ? "user.ban" : "user.unban", data.id);
    }
    if (data.admin !== undefined) {
      if (data.id === context.userId && !data.admin) throw new Error("You cannot remove your own admin role");
      if (data.admin) await sb.from("user_roles").insert({ user_id: data.id, role: "admin" });
      else await sb.from("user_roles").delete().eq("user_id", data.id).eq("role", "admin");
      await audit(context, data.admin ? "role.grant_admin" : "role.revoke_admin", data.id);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("You cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("watchlist").delete().eq("user_id", data.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error("Delete failed");
    await audit(context, "user.delete", data.id);
    return { ok: true };
  });

const serverSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  base_url: z.string().min(1).max(500).refine((value) =>
    value.startsWith("storage://")
      ? value.length > "storage://".length && !value.slice("storage://".length).includes("/")
      : isPublicHttpUrl(value), "Use storage://bucket or a public HTTPS URL"),
  is_active: z.boolean(),
  priority: z.number().int(),
});

export const listServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("server_config").select("*").order("priority");
    return data ?? [];
  });

export const saveServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => serverSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const res = id
      ? await context.supabase.from("server_config").update(rest).eq("id", id).select("id").single()
      : await context.supabase.from("server_config").insert(rest).select("id").single();
    if (res.error) throw new Error(res.error.message);
    await audit(context, id ? "server.update" : "server.create", res.data.id);
    return { ok: true };
  });

export const deleteServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("server_config").delete().eq("id", data.id);
    await audit(context, "server.delete", data.id);
    return { ok: true };
  });

export const checkServers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: servers } = await context.supabase.from("server_config").select("id, base_url");
    await Promise.all(
      (servers ?? []).map(async (s) => {
        let ms: number | null = null;
        if (s.base_url.startsWith("storage://")) ms = 0;
        else if (isPublicHttpUrl(s.base_url)) {
          const t = Date.now();
          try {
            await fetch(s.base_url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
            ms = Date.now() - t;
          } catch {
            ms = null;
          }
        }
        await context.supabase
          .from("server_config")
          .update({ last_latency_ms: ms, last_checked_at: new Date().toISOString() })
          .eq("id", s.id);
      }),
    );
    await audit(context, "server.health_check");
    return { ok: true };
  });

export const listVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("licensed_videos")
      .select("*, server_config(name), media_catalog(title, poster_path)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const saveVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => videoSourceSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: server } = await context.supabase.from("server_config").select("base_url").eq("id", data.server_id).single();
    if (!server) throw new Error("Server not found");
    if (data.source_type === "embed" && server.base_url.startsWith("storage://")) throw new Error("Embed URLs need an external server");
    await getDetails({ data: { type: data.media_type, id: data.tmdb_id } });
    const { data: catalog, error: catalogError } = await context.supabase.from("media_catalog").select("id").eq("tmdb_id", data.tmdb_id).eq("media_type", data.media_type).single();
    if (catalogError || !catalog) throw new Error("Could not link movie metadata");
    const { data: row, error } = await context.supabase.from("licensed_videos").insert({ ...data, catalog_id: catalog.id }).select("id").single();
    if (error) throw new Error(error.message);
    await audit(context, "video.create", row.id);
    return { ok: true };
  });

export const listCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("media_catalog")
      .select("*, licensed_videos(id)").order("updated_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const importCatalogTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ type: z.enum(["movie", "tv"]), id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const title = await getDetails({ data });
    await audit(context, "catalog.import", `${data.type}:${data.id}`);
    return { title: title.title };
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("licensed_videos").delete().eq("id", data.id);
    await audit(context, "video.delete", data.id);
    return { ok: true };
  });

export const listAdvertisements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("advertisements").select("*").order("sort_order").order("created_at");
    if (error) throw new Error("Could not load advertisements");
    return (data ?? []).map((ad) => ({ ...advertisementSchema.parse(ad), id: ad.id }));
  });

export const saveAdvertisement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => advertisementSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...fields } = data;
    const values = { ...fields, updated_at: new Date().toISOString() };
    const result = id
      ? await context.supabase.from("advertisements").update(values).eq("id", id).select("id").single()
      : await context.supabase.from("advertisements").insert(values).select("id").single();
    if (result.error) throw new Error("Could not save advertisement");
    await audit(context, id ? "ad.update" : "ad.create", result.data.id);
    return { id: result.data.id };
  });

export const deleteAdvertisement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("advertisements").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete advertisement");
    await audit(context, "ad.delete", data.id);
    return { ok: true };
  });
