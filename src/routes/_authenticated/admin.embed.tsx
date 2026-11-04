import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getEmbedSettings, saveEmbedSettings } from "@/lib/admin.functions";
import { DEFAULT_EMBED_TEMPLATES, embedPlaybackUrl, embedTemplatesSchema } from "@/lib/playback-url";

const embedQuery = queryOptions({ queryKey: ["admin-embed-settings"], queryFn: () => getEmbedSettings() });

export const Route = createFileRoute("/_authenticated/admin/embed")({
  loader: ({ context }) => context.queryClient.ensureQueryData(embedQuery),
  head: () => ({ meta: [
    { title: "Embed playback — Layar Emas" },
    { name: "description", content: "Manage authorized movie and TV playback addresses on Layar Emas." },
    { property: "og:title", content: "Embed playback — Layar Emas" },
    { property: "og:description", content: "Manage authorized movie and TV playback addresses on Layar Emas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: EmbedPage,
});

function EmbedPage() {
  const { data } = useSuspenseQuery(embedQuery);
  const [form, setForm] = useState(data);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveEmbedSettings);
  const qc = useQueryClient();
  const parsed = embedTemplatesSchema.safeParse(form);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.success || !confirmed) return;
    setBusy(true);
    try {
      await save({ data: { ...parsed.data, rights_confirmed: true } });
      await qc.invalidateQueries({ queryKey: ["admin-embed-settings"] });
      await qc.invalidateQueries({ queryKey: ["playback"] });
      await qc.invalidateQueries({ queryKey: ["party-playback"] });
      setConfirmed(false);
      toast.success("Embed settings saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save settings"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-4xl space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-4xl font-bold">Embed playback</h1>
      <Button type="submit" variant="hero" disabled={busy || !confirmed || !parsed.success}><Save />{busy ? "Saving…" : "Save changes"}</Button>
    </div>
    <section className="space-y-6 border-t border-border pt-6">
      {(["movie", "tv"] as const).map((type) => {
        const key = type === "movie" ? "movie_embed_template" : "tv_embed_template";
        const issue = parsed.success ? null : parsed.error.issues.find((i) => i.path[0] === key)?.message;
        const example = parsed.success ? embedPlaybackUrl({ type, id: type === "movie" ? 862 : 1399, s: 2, e: 3 }, parsed.data) : null;
        return <div key={type} className="space-y-2">
          <Label htmlFor={key}>{type === "movie" ? "Movie embed URL" : "TV embed URL"}</Label>
          <Input id={key} value={form[key]} placeholder={DEFAULT_EMBED_TEMPLATES[key]} onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setConfirmed(false); }} aria-invalid={!!issue} />
          {issue && <p className="text-sm text-destructive">{issue}</p>}
          {example && <div className="space-y-1"><p className="text-xs font-semibold text-muted-foreground">{type === "movie" ? "Movie 862" : "TV 1399 · Season 2 · Episode 3"}</p><p className="break-all text-sm text-muted-foreground">{example}</p></div>}
        </div>;
      })}
    </section>
    <div className="flex items-start gap-3">
      <Checkbox id="embed-rights" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
      <Label htmlFor="embed-rights" className="leading-relaxed">Saya memiliki izin untuk menayangkan film dan serial dari alamat embed ini.</Label>
    </div>
    <Button type="button" variant="outline" disabled={busy} onClick={() => { setForm(DEFAULT_EMBED_TEMPLATES); setConfirmed(false); }}><RotateCcw />Reset to Nxsha</Button>
  </form>;
}