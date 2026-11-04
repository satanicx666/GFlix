import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteVideo, listCatalog, listServers, listVideos, saveVideo } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/videos")({
  validateSearch: (s) => z.object({ tmdb: z.coerce.number().optional(), type: z.enum(["movie", "tv"]).optional() }).parse(s),
  head: () => ({ meta: [
    { title: "Admin videos — Layar Emas" },
    { name: "description", content: "Manage licensed movie, TV and embed sources on Layar Emas." },
    { property: "og:title", content: "Admin videos — Layar Emas" },
    { property: "og:description", content: "Manage licensed movie, TV and embed sources on Layar Emas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Videos,
});

function Videos() {
  const qc = useQueryClient();
  const lv = useServerFn(listVideos);
  const ls = useServerFn(listServers);
  const save = useServerFn(saveVideo);
  const del = useServerFn(deleteVideo);
  const lc = useServerFn(listCatalog);
  const catalog = useQuery({ queryKey: ["admin-catalog"], queryFn: () => lc() });
  const videos = useQuery({ queryKey: ["admin-videos"], queryFn: () => lv() });
  const servers = useQuery({ queryKey: ["admin-servers"], queryFn: () => ls() });
  const initial = Route.useSearch();
  const [f, setF] = useState({ tmdb_id: initial.tmdb ? String(initial.tmdb) : "", media_type: initial.type ?? "movie", season: "", episode: "", server_id: "", path: "", quality: "1080p", title: "", source_type: "video" as "video" | "embed" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const server = servers.data?.find((s) => s.id === f.server_id);
  const isStorage = server?.base_url.startsWith("storage://");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!server) { toast.error("Choose a server"); return; }
    setBusy(true);
    try {
      let path = f.path;
      if (isStorage) {
        if (!file) throw new Error("Choose a video file");
        const bucket = server.base_url.slice("storage://".length);
        path = `${f.media_type}/${f.tmdb_id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
        if (error) throw new Error(error.message);
      }
      await save({
        data: {
          tmdb_id: Number(f.tmdb_id),
          media_type: f.media_type as "movie" | "tv",
          season: f.media_type === "tv" ? Number(f.season || 1) : null,
          episode: f.media_type === "tv" ? Number(f.episode || 1) : null,
          server_id: f.server_id,
          path,
          quality: f.quality,
          title: f.title || null,
          source_type: isStorage ? "video" : f.source_type,
        },
      });
      toast.success("Video added");
      setFile(null);
      setF({ ...f, path: "", title: "" });
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries({ queryKey: ["admin-catalog"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Licensed videos</h1>
      <p className="text-sm text-muted-foreground">Only add videos you own or are licensed to distribute. Find the TMDB id in the title's page address.</p>
      <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
        <select aria-label="Saved movie or TV show" value="" onChange={(e) => {
          const selected = catalog.data?.find((c) => c.id === e.target.value);
          if (selected) setF({ ...f, tmdb_id: String(selected.tmdb_id), media_type: selected.media_type === "tv" ? "tv" : "movie" });
        }} className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-4">
          <option value="">Choose from saved catalog…</option>
          {catalog.data?.map((c) => <option key={c.id} value={c.id}>{c.title} · {c.media_type} · {c.tmdb_id}</option>)}
        </select>
        <Input placeholder="TMDB id" value={f.tmdb_id} onChange={(e) => setF({ ...f, tmdb_id: e.target.value })} required />
        <select value={f.media_type} onChange={(e) => setF({ ...f, media_type: e.target.value === "tv" ? "tv" : "movie" })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="movie">Movie</option>
          <option value="tv">TV episode</option>
        </select>
        {!isStorage && <select aria-label="Source format" value={f.source_type} onChange={(e) => setF({ ...f, source_type: e.target.value === "embed" ? "embed" : "video" })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="video">Direct video</option><option value="embed">Licensed embed URL</option>
        </select>}
        {f.media_type === "tv" && (
          <>
            <Input placeholder="Season" value={f.season} onChange={(e) => setF({ ...f, season: e.target.value })} />
            <Input placeholder="Episode" value={f.episode} onChange={(e) => setF({ ...f, episode: e.target.value })} />
          </>
        )}
        <select value={f.server_id} onChange={(e) => setF({ ...f, server_id: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Server…</option>
          {servers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {isStorage ? (
          <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="md:col-span-2" />
        ) : (
          <Input placeholder={f.source_type === "embed" ? "Licensed HTTPS embed URL" : "Path on server, e.g. films/123.mp4"} value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })} className="md:col-span-2" required />
        )}
        <Input placeholder="Quality" value={f.quality} onChange={(e) => setF({ ...f, quality: e.target.value })} />
        <Input placeholder="Label (optional)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Button type="submit" variant="hero" disabled={busy}>{busy ? "Saving…" : "Add video"}</Button>
      </form>
      <div className="space-y-2">
        {videos.data?.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3 text-sm">
            <span>
              {v.media_catalog?.title || v.title || `${v.media_type} ${v.tmdb_id}`}
              {v.media_type === "tv" && ` · S${v.season}E${v.episode}`}
              <span className="text-muted-foreground"> · {v.server_config?.name} · {v.quality} · {v.source_type}</span>
            </span>
            <Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: v.id } }); qc.invalidateQueries({ queryKey: ["admin-videos"] }); }}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
