import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Admin — Layar Emas" },
      { name: "description", content: "Admin panel." },
      { property: "og:title", content: "Admin — Layar Emas" },
      { property: "og:description", content: "Admin panel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const links = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/servers", label: "Servers" },
  { to: "/admin/videos", label: "Videos" },
  { to: "/admin/catalog", label: "Film catalog" },
  { to: "/admin/ads", label: "Advertisements" },
  { to: "/admin/embed", label: "Embed playback" },
  { to: "/admin/settings", label: "Appearance & SEO" },
] as const;

function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
      <nav className="mb-8 flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: "exact" in l }}
            className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: "border-primary bg-primary/10 text-primary" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
