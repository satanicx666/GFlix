import { useEffect, useState } from "react";
import { AdCreative } from "./AdSlot";
import type { Advertisement } from "@/lib/advertisements";
import { Button } from "@/components/ui/button";

export function Preroll({ ad, onComplete }: { ad: Advertisement; onComplete: () => void }) {
  const [left, setLeft] = useState(ad.duration_seconds);
  useEffect(() => {
    const timer = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="flex h-full flex-col items-center justify-center gap-3 overflow-y-auto bg-background p-4">
    <div className="w-full max-w-2xl"><AdCreative ad={ad} /></div>
    <Button variant="secondary" disabled={left > 0} onClick={onComplete}>{left > 0 ? `Continue in ${left}s` : "Continue to video"}</Button>
  </div>;
}