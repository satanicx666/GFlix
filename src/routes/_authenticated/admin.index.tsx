import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminStats } from "@/lib/admin.functions";
import { Stat } from "@/components/Stat";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [
    { title: "Admin dashboard — Layar Emas" },
    { name: "description", content: "Advertisements, licensed videos and recent admin activity." },
    { property: "og:title", content: "Admin dashboard — Layar Emas" },
    { property: "og:description", content: "Advertisements, licensed videos and recent admin activity." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(adminStats);
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn() });
  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data.users} />
        <Stat label="Active advertisements" value={data.ads} />
        <Stat label="Servers active" value={`${data.serversActive}/${data.serversTotal}`} />
        <Stat label="Licensed videos" value={data.videos} />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-xl font-semibold">Recent admin activity</h2>
        {data.log.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        <ul className="space-y-2 text-sm">
          {data.log.map((l) => (
            <li key={l.id} className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <span>{l.action} <span className="text-muted-foreground">{l.target_id?.slice(0, 8)}</span></span>
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("id-ID")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
