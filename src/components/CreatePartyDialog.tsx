import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Globe, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createParty } from "@/lib/party.functions";
import { createPartySchema } from "@/lib/party-invite";

export function CreatePartyDialog({ type, tmdbId, title, season, episode }: { type: "movie" | "tv"; tmdbId: number; title: string; season?: number; episode?: number }) {
  const [open,setOpen] = useState(false);
  const [visibility,setVisibility] = useState<"public" | "private">("public");
  const [pin,setPin] = useState("");
  const [busy,setBusy] = useState(false);
  const create = useServerFn(createParty);
  const navigate = useNavigate();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createPartySchema.safeParse({ type,tmdbId,title,season,episode,visibility,pin });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check room details"); return; }
    setBusy(true);
    try { const room = await create({data:parsed.data}); setOpen(false); setPin(""); await navigate({to:"/party/$code",params:{code:room.code}}); }
    catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" variant="glass"><Users /> Start watch party</Button></DialogTrigger>
    <DialogContent><DialogTitle>Start Watch Party</DialogTitle>
      <form onSubmit={submit} className="space-y-5">
        <p className="font-display text-xl">{title}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={visibility==="public"?"hero":"secondary"} aria-pressed={visibility==="public"} onClick={()=>setVisibility("public")}><Globe /> Public</Button>
          <Button type="button" variant={visibility==="private"?"hero":"secondary"} aria-pressed={visibility==="private"} onClick={()=>setVisibility("private")}><Lock /> Private</Button>
        </div>
        {visibility==="private" && <div className="space-y-2"><Label htmlFor="party-pin">Room PIN</Label><Input id="party-pin" type="password" inputMode="numeric" autoComplete="new-password" minLength={4} maxLength={8} value={pin} onChange={e=>setPin(e.target.value)} required /></div>}
        <Button type="submit" variant="hero" disabled={busy}><Users />{busy?"Creating…":"Create room"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}