import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Account — Layar Emas" },
      { name: "description", content: "Your account settings." },
      { property: "og:title", content: "Account — Layar Emas" },
      { property: "og:description", content: "Your account settings." },
    ],
  }),
  component: Account,
});

function Account() {
  const { user } = useAuth();
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as any);
    if (error) { toast.error(error.message); return; }
    setCur("");
    setPw("");
    toast.success("Password changed");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-16 pt-28 md:px-8">
      <h1 className="text-4xl font-bold">Account</h1>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="text-lg font-semibold">{user?.email}</p>
      </div>
      <form onSubmit={changePw} className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Change password</h2>
        <Input type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} required />
        <Input type="password" placeholder="New password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
        <Button type="submit" variant="secondary">Update password</Button>
      </form>
    </div>
  );
}
