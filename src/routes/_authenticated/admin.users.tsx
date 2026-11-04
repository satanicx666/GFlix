import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteUser, listUsers, updateUser } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [
    { title: "Admin users — Layar Emas" },
    { name: "description", content: "Manage Layar Emas accounts and access." },
    { property: "og:title", content: "Admin users — Layar Emas" },
    { property: "og:description", content: "Manage Layar Emas accounts and access." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Users,
});

function Users() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const upd = useServerFn(updateUser);
  const del = useServerFn(deleteUser);
  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });

  async function run(p: Promise<unknown>, msg: string) {
    try {
      await p;
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Users</h1>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="p-3">{u.email}</td>
                <td className="space-x-1 p-3">
                  {u.isAdmin && <Badge>Admin</Badge>}
                  {u.is_banned && <Badge variant="destructive">Banned</Badge>}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => run(upd({ data: { id: u.id, admin: !u.isAdmin } }), "Role updated")}>
                      {u.isAdmin ? "Revoke admin" : "Make admin"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => run(upd({ data: { id: u.id, banned: !u.is_banned } }), "Updated")}>
                      {u.is_banned ? "Unban" : "Ban"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => confirm(`Delete ${u.email}?`) && run(del({ data: { id: u.id } }), "User deleted")}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
