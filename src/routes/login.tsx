import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/AuthCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (s) => z.object({ redirect: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in — Layar Emas" },
      { name: "description", content: "Sign in to play titles and keep your watchlist." },
      { property: "og:title", content: "Sign in — Layar Emas" },
      { property: "og:description", content: "Sign in to play titles and keep your watchlist." },
    ],
  }),
  component: Login,
});

function safePath(p?: string) {
  if (!p) return "/";
  try {
    const u = new URL(p, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : "/";
  } catch {
    return "/";
  }
}

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: safePath(redirect) });
  }

  async function forgot() {
    if (!email) { toast("Enter your email first"); return; }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    toast.success("Check your email for a reset link");
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to play and save titles.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" variant="hero" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={forgot} className="text-muted-foreground hover:text-foreground">
            Forgot password?
          </button>
          <Link to="/register" className="text-primary">Create account</Link>
        </div>
      </form>
    </AuthCard>
  );
}
