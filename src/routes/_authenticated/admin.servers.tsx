import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { checkServers, deleteServer, listServers, saveServer } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/servers")({
  head: () => ({ meta: [
    { title: "Admin servers — Layar Emas" },
    { name: "description", content: "Manage licensed video hosts and server health." },
    { property: "og:title", content: "Admin servers — Layar Emas" },
    { property: "og:description", content: "Manage licensed video hosts and server health." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Servers,
});

function Servers() {
  const qc = useQueryClient();
  const list = useServerFn(listServers);
  const save = useServerFn(saveServer);
  const del = useServerFn(deleteServer);
  const check = useServerFn(checkServers);
  const { data } = useQuery({ queryKey: ["admin-servers"], queryFn: () => list() });
  const [form, setForm] = useState({ name: "", base_url: "", priority: 100 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-servers"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save({ data: { ...form, is_active: true } });
      setForm({ name: "", base_url: "", priority: 100 });
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">Servers</h1>
        <Button variant="hero" onClick={async () => { await check(); refresh(); toast.success("Health check done"); }}>
          <Activity /> Run health check
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Use <code>storage://videos</code> for files uploaded here, or the base address of your own licensed video host.
      </p>
      <div className="space-y-3">
        {data?.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-48 flex-1">
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.base_url} · priority {s.priority}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {s.last_checked_at ? (s.last_latency_ms === null ? "Down" : `${s.last_latency_ms}ms`) : "Not checked"}
            </p>
            <label className="flex items-center gap-2 text-sm">
              Active
              <Switch
                checked={s.is_active}
                onCheckedChange={async (v) => { await save({ data: { ...s, is_active: v } }); refresh(); }}
              />
            </label>
            <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete server and its videos?")) { await del({ data: { id: s.id } }); refresh(); } }}>
              Delete
            </Button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-border p-4">
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-48" required />
        <Input placeholder="https://cdn.yourdomain.com/" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} className="min-w-64 flex-1" required />
        <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="w-24" />
        <Button type="submit" variant="secondary">Add server</Button>
      </form>
    </div>
  );
}
