import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Copy, Globe, Lock, Send, SkipBack, SkipForward, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdSlot } from "@/components/AdSlot";
import { supabase } from "@/integrations/supabase/client";
import { getPlayback } from "@/lib/play.functions";
import { getDetails, type Details } from "@/lib/tmdb.functions";
import { useNextEpisode, usePrevEpisode } from "@/components/WatchExtras";
import { useAuth } from "@/lib/auth";
import { partyCodeSchema } from "@/lib/party-invite";

export const Route = createFileRoute("/_authenticated/party/$code")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Watch Party room — Layar Emas" },
      { name: "description", content: "Watching together on Layar Emas." },
      { property: "og:title", content: "Watch Party room — Layar Emas" },
      { property: "og:description", content: "Watching together on Layar Emas." },
    ],
  }),
  component: Room,
});

type SyncAction = "play" | "pause" | "seek";
type Msg = { id: string; display_name: string; text: string };

function Room() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const fetchPlayback = useServerFn(getPlayback);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remote = useRef(false);
  const [viewers, setViewers] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [pin, setPin] = useState("");
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [connection, setConnection] = useState("Connecting…");
  const [sending, setSending] = useState(false);
  const [changingEpisode, setChangingEpisode] = useState(false);

  const party = useQuery({
    queryKey: ["party", code, user?.id],
    enabled: !!user && joined,
    refetchInterval: 2000,
    queryFn: async () => {
      const parsed = partyCodeSchema.safeParse(code);
      if (!parsed.success) return null;
      const { data, error } = await supabase.rpc("get_watch_party_by_code", { p_code: parsed.data });
      if (error) throw new Error("Could not join party");
      return data?.[0] ?? null;
    },
  });
  const p = party.data;
  const season = p?.season ?? 1;
  const episode = p?.episode ?? 1;
  const details = useQuery({
    queryKey: ["details", p?.media_type === "tv" ? "tv" : "movie", p?.tmdb_id],
    enabled: !!p && p.media_type === "tv",
    queryFn: () => {
      if (!p) throw new Error("Party not found");
      return getDetails({ data: { type: "tv", id: p.tmdb_id } });
    },
    staleTime: 300_000,
  });
  const playback = useQuery({
    queryKey: ["party-playback", code, user?.id, p?.tmdb_id, season, episode],
    enabled: !!p,
    queryFn: () => {
      if (!p) throw new Error("Party not found");
      return fetchPlayback({
        data: { type: p.media_type === "tv" ? "tv" : "movie", id: p.tmdb_id, s: p.media_type === "tv" ? season : undefined, e: p.media_type === "tv" ? episode : undefined },
      });
    },
  });

  async function joinRoom(event?: React.FormEvent) {
    event?.preventDefault();
    if (!user || joining) return;
    const parsed = partyCodeSchema.safeParse(code);
    if (!parsed.success) { setJoinError("Invalid room code"); return; }
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc("join_watch_party", { p_code:parsed.data,p_pin:pin,p_name:user.email?.split("@")[0]?.slice(0,80) || "member" });
      if(error || !data) { setJoinError("Room unavailable or PIN incorrect. Try again later if you have made too many attempts."); return; }
      setJoined(true); setPin(""); setJoinError("");
    } catch { setJoinError("Could not join room"); }
    finally { setJoining(false); }
  }
  useEffect(()=>{
    if (!user) return;
    let cancelled=false;
    const parsed=partyCodeSchema.safeParse(code);
    if(!parsed.success) return;
    void supabase.rpc("join_watch_party",{p_code:parsed.data,p_pin:"",p_name:user.email?.split("@")[0]?.slice(0,80) || "member"}).then(({data})=>{ if(!cancelled && data) setJoined(true); });
    return ()=>{cancelled=true;};
  },[code,user?.id]);

  useEffect(() => {
    if (!user || !joined || !p) return;
    let cancelled=false;
    async function refresh() {
      const heartbeat=await supabase.rpc("party_heartbeat",{p_code:code});
      const [people,chat]=await Promise.all([
        supabase.from("party_members").select("display_name").eq("code",code).gt("last_seen_at",new Date(Date.now()-120_000).toISOString()),
        supabase.from("party_messages").select("id,display_name,text").eq("code",code).order("created_at",{ascending:false}).limit(100),
      ]);
      if(cancelled) return;
      setConnection(heartbeat.error || people.error || chat.error ? "Disconnected — retrying…" : "Connected");
      if(people.data) setViewers(people.data.map(viewer=>viewer.display_name));
      if(chat.data) setMsgs([...chat.data].reverse());
    }
    void refresh();
    const interval=setInterval(()=>void refresh(),2500);
    return ()=>{cancelled=true;clearInterval(interval);};
  }, [code, user?.id, joined, p?.code]);

  useEffect(()=>{
    const video=videoRef.current;
    if(!video || !p || user?.id===p.host_id) return;
    remote.current=true;
    const elapsed=p.playback_action==="play" ? Math.max(0,(Date.now()-Date.parse(p.playback_updated_at))/1000) : 0;
    const target=p.playback_time+elapsed;
    if(Math.abs(video.currentTime-target)>1.5) video.currentTime=target;
    if(p.playback_action==="play") void video.play().catch(()=>{});
    if(p.playback_action==="pause") video.pause();
    const timeout=setTimeout(()=>{remote.current=false;},300);
    return ()=>clearTimeout(timeout);
  },[p?.playback_updated_at,p?.playback_time,p?.playback_action,user?.id]);

  async function emit(action: SyncAction) {
    const video=videoRef.current;
    if(remote.current || !video || !p || user?.id!==p.host_id) return;
    await supabase.from("watch_parties").update({playback_time:video.currentTime,playback_action:action,playback_updated_at:new Date().toISOString()}).eq("code",p.code);
  }
  async function goToEpisode(next: { season: number; episode: number }) {
    if (!p || !user || user.id !== p.host_id || changingEpisode) return;
    setChangingEpisode(true);
    try {
      const { error } = await supabase.from("watch_parties").update({ season: next.season, episode: next.episode }).eq("code", p.code);
      if (error) { toast.error("Could not switch episode"); return; }
      await party.refetch();
      toast.success(`Switched to S${next.season} E${next.episode}`);
    } catch { toast.error("Could not switch episode"); }
    finally { setChangingEpisode(false); }
  }
  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user || !p || sending || connection !== "Connected") return;
    setSending(true);
    try {
      const {error}=await supabase.from("party_messages").insert({code:p.code,user_id:user.id,display_name:user.email?.split("@")[0]?.slice(0,80) || "member",text:text.trim().slice(0,300)});
      if(error) {toast.error("Message not sent. Please try again.");return;}
      setText("");
    } catch {toast.error("Message not sent. Please try again.");}
    finally {setSending(false);}
  }

  if (!joined) return <div className="mx-auto max-w-md space-y-5 px-4 pb-16 pt-32">
    <h1 className="flex items-center gap-2 text-3xl font-semibold"><Lock className="text-primary" /> Join private room</h1>
    <form onSubmit={joinRoom} className="space-y-4"><Label htmlFor="join-pin">Room PIN</Label><Input id="join-pin" type="password" inputMode="numeric" maxLength={8} value={pin} onChange={event=>setPin(event.target.value)} autoComplete="off" />
      {joinError && <p role="alert" className="text-sm text-destructive">{joinError}</p>}
      <Button type="submit" variant="hero" disabled={joining}>{joining?"Joining…":"Join room"}</Button>
    </form><Button asChild variant="ghost"><Link to="/party">Public rooms</Link></Button>
  </div>;

  if (party.isLoading) return <p className="px-8 pt-32 text-muted-foreground">Joining…</p>;
  if (party.isError) return <div className="space-y-4 px-8 pt-32 text-center"><p>Could not join this party.</p><Button onClick={() => void party.refetch()}>Try again</Button></div>;
  if (!p)
    return (
      <div className="px-8 pt-32 text-center">
        <p className="text-muted-foreground">No party with code {code}.</p>
        <Button asChild variant="hero" className="mt-4"><Link to="/party">Back</Link></Button>
      </div>
    );

  const src = playback.data?.sources.find((source) => source.sourceType !== "embed") ?? playback.data?.sources[0];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 pt-24 md:px-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{p.title ?? "Watch Party"}</h1>
          <Button
            variant="glass"
            size="sm"
            onClick={async () => {
              try { await navigator.clipboard.writeText(window.location.href); toast.success("Invite link copied"); }
              catch { toast.error("Could not copy link. Copy the room address instead."); }
            }}
          >
            <Copy /> Invite link
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3"><p className="flex items-center gap-1 text-xs text-primary">{p.visibility==="public"?<Globe className="h-4 w-4" />:<Lock className="h-4 w-4" />}{p.visibility==="public"?"Public room":"Private room"}</p>
          {user?.id===p.host_id && <Button size="sm" variant="ghost" onClick={async()=>{const {error}=await supabase.from("watch_parties").update({is_active:false}).eq("code",p.code);if(error) toast.error("Could not end room");else await party.refetch();}}><X /> End room</Button>}
        </div>
        <p className="break-all text-xs text-muted-foreground">Room code: {p.code}</p>
        {p.media_type === "tv" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">Season {season} · Episode {episode}</p>
            {user?.id === p.host_id && details.data && (
              <PartyEpisodeNav details={details.data} season={season} episode={episode} disabled={changingEpisode} onGo={goToEpisode} />
            )}
          </div>
        )}
        <AdSlot placement="party_top" />
        <div className="relative aspect-video overflow-hidden rounded-xl bg-card shadow-card">
          {playback.isLoading && <div className="flex h-full items-center justify-center text-muted-foreground">Loading video…</div>}
          {playback.data?.error && <div className="flex h-full items-center justify-center text-muted-foreground">{playback.data.error}</div>}
          {playback.isError && <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><p>Could not load playback.</p><Button onClick={() => void playback.refetch()}>Try again</Button></div>}
          {!src && !playback.isLoading && !playback.isError && !playback.data?.error && <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">No video available for this party.</div>}
          {src?.url ? (
            src.sourceType === "embed" ? <iframe key={src.url} src={src.url} title="Watch Party video player" allow="encrypted-media; autoplay *; fullscreen *; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full" /> : <video
              ref={videoRef}
              src={src.url}
              controls
              className="h-full w-full bg-background"
              onPlay={() => emit("play")}
              onPause={() => emit("pause")}
              onSeeked={() => emit("seek")}
            />
          ) : null}
        </div>
        {src?.sourceType === "embed" && <p className="text-xs text-muted-foreground" role="status">Pemutar embed: play, pause, dan posisi video diatur masing-masing penonton; chat tetap terhubung.</p>}
        <AdSlot placement="party_bottom" />
      </div>
      <aside className="flex h-[70vh] min-w-0 flex-col rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> {viewers.length} watching</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{viewers.join(", ")}</p>
          <p className="mt-1 text-xs text-muted-foreground" role="status">{connection}</p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
          {msgs.length === 0 && <p className="text-muted-foreground">Say hi 👋</p>}
          {msgs.map((m, i) => (
            <p key={m.id || i} className="break-words"><span className="font-semibold text-primary">{m.display_name}</span> {m.text}</p>
          ))}
        </div>
        <form onSubmit={sendChat} className="flex gap-2 border-t border-border p-3">
          <Input aria-label="Message" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" />
          <Button type="submit" aria-label="Send message" size="icon" variant="hero" disabled={sending || connection !== "Connected" || !text.trim()}><Send /></Button>
        </form>
      </aside>
    </div>
  );
}

function PartyEpisodeNav({ details, season, episode, disabled, onGo }: { details: Details; season: number; episode: number; disabled: boolean; onGo: (target: { season: number; episode: number }) => void }) {
  const { next, isPending: nextPending } = useNextEpisode(details, season, episode);
  const { prev, isPending: prevPending } = usePrevEpisode(details, season, episode);
  return <div className="flex items-center gap-2">
    {prevPending ? <Button size="sm" variant="secondary" disabled><SkipBack /> Previous…</Button>
      : prev ? <Button size="sm" variant="secondary" onClick={() => onGo(prev)} disabled={disabled} aria-label={`Previous episode: season ${prev.season} episode ${prev.episode}`}><SkipBack /> Previous episode</Button> : null}
    {nextPending ? <Button size="sm" variant="secondary" disabled><SkipForward /> Next episode…</Button>
      : next ? <Button size="sm" variant="hero" onClick={() => onGo(next)} disabled={disabled} aria-label={`Next episode: season ${next.season} episode ${next.episode}`}><SkipForward /> Next episode</Button> : null}
  </div>;
}
