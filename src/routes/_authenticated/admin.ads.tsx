import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Eye, Pencil, Plus, Save, Trash2, Play, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AdCreative } from "@/components/AdSlot";
import { AD_PLACEMENTS, HOME_AD_GROUPS, advertisementSchema, EMPTY_AD, type Advertisement } from "@/lib/advertisements";
import { listAdvertisements, saveAdvertisement, deleteAdvertisement } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/ads")({
  head: () => ({ meta: [
    { title: "Advertisement placements — Layar Emas" },
    { name: "description", content: "Manage advertisements and preview their placement on Layar Emas." },
    { property: "og:title", content: "Advertisement placements — Layar Emas" },
    { property: "og:description", content: "Manage advertisements and preview their placement on Layar Emas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminAds,
});

function AdminAds() {
  const qc = useQueryClient();
  const list = useServerFn(listAdvertisements);
  const save = useServerFn(saveAdvertisement);
  const remove = useServerFn(deleteAdvertisement);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["admin-ads"], queryFn: () => list() });
  const [form, setForm] = useState<Advertisement>({ ...EMPTY_AD });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mobile, setMobile] = useState(false);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin-ads"] }), qc.invalidateQueries({ queryKey: ["advertisements"] }), qc.invalidateQueries({ queryKey: ["admin-stats"] })]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = advertisementSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check advertisement fields"); return; }
    setBusy(true);
    try { await save({ data: parsed.data }); await refresh(); setForm({ ...EMPTY_AD }); toast.success("Advertisement saved"); }
    catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { toast.error("Choose an image under 5 MB"); return; }
    setUploading(true);
    try {
      const path = `ads/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data, error: signError } = await supabase.storage.from("branding").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signError) throw signError;
      setForm((f) => ({ ...f, image_url: data.signedUrl }));
    } catch (error) { toast.error((error as Error).message); }
    finally { setUploading(false); }
  }

  const previewAd = { ...form, headline: form.headline || (!form.image_url ? "Your advertisement" : "") };
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-4xl font-bold">Advertisements</h1>
      <Button variant="secondary" onClick={() => setForm({ ...EMPTY_AD })}><Plus /> New advertisement</Button>
    </div>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-xl font-semibold">{form.id ? "Edit advertisement" : "New advertisement"}</h2>
        <div className="space-y-2"><Label htmlFor="ad-name">Name</Label><Input id="ad-name" value={form.name} maxLength={100} required onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="ad-headline">Headline</Label><Input id="ad-headline" value={form.headline} maxLength={160} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="ad-image">Image URL</Label><Input id="ad-image" type="url" placeholder="https://…" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value || null })} />
          <Button asChild variant="secondary" size="sm"><label><Upload /> {uploading ? "Uploading…" : "Upload image"}<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} /></label></Button>
        </div>
        <div className="space-y-2"><Label htmlFor="ad-link">Destination URL</Label><Input id="ad-link" type="url" placeholder="https://…" value={form.target_url ?? ""} onChange={(e) => setForm({ ...form, target_url: e.target.value || null })} /></div>
        <div className="space-y-2"><Label htmlFor="ad-placement">Placement</Label><select id="ad-placement" className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={form.placement} onChange={(e) => { const placement = AD_PLACEMENTS.find((p) => p.value === e.target.value); if (placement) setForm({ ...form, placement: placement.value }); }}>{AD_PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="ad-order">Display order</Label><Input id="ad-order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
          {form.placement === "preroll" && <div className="space-y-2"><Label htmlFor="ad-duration">Duration (seconds)</Label><Input id="ad-duration" type="number" min={1} max={30} value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) })} /></div>}
        </div>
        <div className="flex items-center justify-between"><Label htmlFor="ad-active">Active</Label><Switch id="ad-active" checked={form.is_active} onCheckedChange={(is_active) => setForm({ ...form, is_active })} /></div>
        <Button type="submit" variant="hero" disabled={busy || uploading}><Save /> {busy ? "Saving…" : "Save advertisement"}</Button>
      </form>
      <section className="min-w-0 space-y-3" aria-label="Placement preview">
        <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-xl font-semibold"><Eye className="h-5 w-5" /> Placement preview</h2><div className="flex gap-1"><Button size="sm" variant={!mobile ? "secondary" : "ghost"} onClick={() => setMobile(false)}>Desktop</Button><Button size="sm" variant={mobile ? "secondary" : "ghost"} onClick={() => setMobile(true)}>Mobile</Button></div></div>
        <div className={`mx-auto overflow-hidden rounded-lg border border-border bg-background ${mobile ? "max-w-80" : "w-full"}`}>
          <div className="border-b border-border px-4 py-3 font-display font-semibold">Layar Emas</div>
          <PlacementPreview ad={previewAd} mobile={mobile} />
          <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">Metadata by TMDB</div>
        </div>
      </section>
    </div>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Saved advertisements</h2>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Could not load advertisements.</p>}
      {!isLoading && !error && !data.length && <p className="text-muted-foreground">No advertisements yet.</p>}
      {data.map((ad) => <div key={ad.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-4">
        <div className="min-w-0 flex-1"><p className="break-words font-semibold">{ad.name}</p><p className="text-xs text-muted-foreground">{AD_PLACEMENTS.find((p) => p.value === ad.placement)?.label} · {ad.is_active ? "Active" : "Inactive"}</p></div>
        <Switch aria-label={`Activate ${ad.name}`} checked={ad.is_active} onCheckedChange={async (is_active) => { try { await save({ data: { ...ad, is_active } }); await refresh(); } catch (error) { toast.error((error as Error).message); } }} />
        <Button size="icon" variant="ghost" aria-label={`Edit ${ad.name}`} title="Edit advertisement" onClick={() => setForm(ad)}><Pencil /></Button>
        <Button size="icon" variant="ghost" aria-label={`Delete ${ad.name}`} title="Delete advertisement" onClick={async () => { if (!confirm(`Delete ${ad.name}?`)) return; try { await remove({ data: { id: ad.id } }); if (form.id === ad.id) setForm({ ...EMPTY_AD }); await refresh(); } catch (error) { toast.error((error as Error).message); } }}><Trash2 /></Button>
      </div>)}
    </section>
  </div>;
}

function PlacementPreview({ ad, mobile }: { ad: Advertisement; mobile: boolean }) {
  const placement = ad.placement;
  const basePlacement = placement.replace(/_[23]$/, "");
  const creative = <AdCreative ad={ad} preview />;
  const posters = <div className="grid grid-cols-3 gap-2">{[1,2,3].map((n) => <div key={n} className="aspect-[2/3] rounded bg-secondary" />)}</div>;
  if (placement.startsWith("home")) return <div className="space-y-4 p-4">
    {HOME_AD_GROUPS.map((group, index) => <div key={group.title} className="space-y-3">
      {index === 0 ? <div className="flex h-32 items-end bg-secondary p-4 font-display text-2xl">{group.title}</div> : <><h3 className="font-semibold">{group.title}</h3>{posters}</>}
      <div className={`grid gap-2 ${group.placements.length > 1 && !mobile ? "grid-cols-2" : "grid-cols-1"}`}>
        {group.placements.map((slot) => <div key={slot} className="min-w-0">
          <p className="mb-1 text-xs text-muted-foreground">{AD_PLACEMENTS.find((item) => item.value === slot)?.label}</p>
          {slot === placement ? creative : <div className="grid min-h-24 place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">Advertisement</div>}
        </div>)}
      </div>
    </div>)}
  </div>;
  const isPlayer = placement.startsWith("watch") && !placement.startsWith("watchlist") || placement.startsWith("party_") && !placement.startsWith("party_directory") || placement === "preroll";
  const top = ["details", "catalog_top", "search_top", "watch_top", "party_top", "party_directory_top", "collection_top", "watchlist_top", "browse_top"].includes(basePlacement);
  return <div className="space-y-4 p-4">
    <h3 className="font-semibold">{placement.startsWith("search") ? "Search results" : placement.startsWith("catalog") ? "Movies / TV Shows" : placement.startsWith("party") ? "Watch Party" : "Film / TV title"}</h3>
    {top && creative}
    {isPlayer && <div className="grid aspect-video place-items-center overflow-hidden rounded-lg bg-secondary p-3">{placement === "preroll" ? <div className="w-full space-y-2">{creative}<p className="text-center text-xs text-muted-foreground">Continue in {ad.duration_seconds}s</p></div> : <Play className="h-10 w-10 text-primary" />}</div>}
    {isPlayer && placement !== "preroll" && !top && creative}
    {basePlacement === "details_bottom" && <><p className="text-sm text-muted-foreground">Cast</p>{creative}</>}
    {basePlacement === "watch_episodes" ? <><h3 className="font-semibold">Episodes</h3><div className="grid grid-cols-2 gap-2">{[1,2,3,4].map((n) => <div key={n} className="aspect-video bg-secondary" />)}</div></> : !isPlayer || basePlacement === "watch_recommendations" ? posters : null}
    {["catalog_bottom", "search_bottom", "party_directory_bottom", "collection_bottom", "watchlist_bottom", "browse_bottom", "footer"].includes(basePlacement) && creative}
  </div>;
}