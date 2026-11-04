import type { ReactNode } from "react";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import hero from "@/assets/hero.jpg";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/settings.functions";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { data: s } = useQuery(settingsQuery);
  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  }
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 pt-16">
      <img src={s?.bg_image_url ?? hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-fade-bottom" />
      <div className="relative w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card/80 p-8 shadow-card backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        {children}
      </div>
    </div>
  );
}
