import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSiteSettings, settingsQuery, type SiteSettings } from "@/lib/settings.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [
    { title: "Appearance & SEO — Layar Emas" },
    { name: "description", content: "Manage Layar Emas branding and search metadata." },
    { property: "og:title", content: "Appearance & SEO — Layar Emas" },
    { property: "og:description", content: "Manage Layar Emas branding and search metadata." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SettingsPage,
});

const PRESETS = [
  { name: "Amber", primary: "#f5a524", background: "#120d08", card: "#2a1f14" },
  { name: "Crimson", primary: "#e50914", background: "#0b0b0f", card: "#1a1a22" },
  { name: "Teal", primary: "#2dd4bf", background: "#06131a", card: "#0f2a33" },
  { name: "Royal", primary: "#60a5fa", background: "#0a0f1f", card: "#16213e" },
  { name: "Emerald", primary: "#34d399", background: "#07130d", card: "#123124" },
];

type ImgKey = "logo_url" | "favicon_url" | "bg_image_url" | "og_image_url";

function SettingsPage() {
  const qc = useQueryClient();
  const save = useServerFn(saveSiteSettings);
  const { data } = useQuery(settingsQuery);
  const [f, setF] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data && !f) setF(data);
  }, [data, f]);
  if (!f) return <p className="text-muted-foreground">Loading…</p>;

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setF({ ...f, [k]: v });

  async function upload(k: ImgKey, file: File) {
    const path = `${k}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { contentType: file.type });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: s } = await supabase.storage.from("branding").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (s?.signedUrl) set(k, s.signedUrl);
  }

  async function submit() {
    setBusy(true);
    try {
      await save({ data: f! });
      await qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const img = (k: ImgKey, label: string, hint: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background">
          {f[k] ? <img src={f[k]!} alt="" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">None</span>}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          <Upload className="h-4 w-4" /> Upload
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(k, e.target.files[0])} />
        </label>
        {f[k] && <Button variant="ghost" size="sm" onClick={() => set(k, null)}>Remove</Button>}
      </div>
      <Input placeholder="…or paste an image link" value={f[k] ?? ""} onChange={(e) => set(k, e.target.value || null)} />
    </div>
  );

  const color = (k: "primary_color" | "background_color" | "card_color", label: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={f[k] ?? "#000000"} onChange={(e) => set(k, e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent" />
        <Input value={f[k] ?? ""} placeholder="Default" onChange={(e) => set(k, e.target.value || null)} className="w-32" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">Appearance & SEO</h1>
        <Button variant="hero" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Theme colors</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setF({ ...f, primary_color: p.primary, background_color: p.background, card_color: p.card })}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary"
            >
              <span className="flex">
                {[p.background, p.card, p.primary].map((c) => (
                  <span key={c} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setF({ ...f, primary_color: null, background_color: null, card_color: null })}>
            Reset to default
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {color("primary_color", "Accent (buttons, highlights)")}
          {color("background_color", "Page background")}
          {color("card_color", "Cards & panels")}
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
        <h2 className="text-xl font-semibold md:col-span-2">Images</h2>
        {img("bg_image_url", "Website background", "Shown on the home banner and sign-in pages. Wide image, ~1920×1080.")}
        {img("logo_url", "Logo", "Shown in the top bar. Transparent PNG works best.")}
        {img("favicon_url", "Browser icon (favicon)", "Square image, 64×64 or larger.")}
        {img("og_image_url", "Share image", "Shown when the home page is shared on WhatsApp, Facebook, X. 1200×630.")}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">SEO</h2>
        <div className="space-y-2">
          <Label>Site name</Label>
          <Input value={f.site_name} onChange={(e) => set("site_name", e.target.value)} maxLength={60} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={300} />
          <p className="text-xs text-muted-foreground">{f.description.length}/160 recommended</p>
        </div>
        <div className="space-y-2">
          <Label>Keywords (comma separated)</Label>
          <Textarea value={f.keywords} onChange={(e) => set("keywords", e.target.value)} maxLength={500} />
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">Google preview</p>
          <p className="mt-1 text-lg text-primary">{f.site_name} — Movies & TV</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{f.description}</p>
        </div>
      </section>
    </div>
  );
}
