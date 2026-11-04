import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Globe, Play, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { publicParties } from "@/lib/party.functions";
import { AdSlot } from "@/components/AdSlot";

const roomsQuery = queryOptions({ queryKey:["public-parties"],queryFn:()=>publicParties(),refetchInterval:15_000 });

export const Route = createFileRoute("/party")({
  loader: ({context})=>context.queryClient.ensureQueryData(roomsQuery),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Watch Party — Layar Emas" },
      { name: "description", content: "Watch together in sync with friends and chat live." },
      { property: "og:title", content: "Watch Party — Layar Emas" },
      { property: "og:description", content: "Watch together in sync with friends and chat live." },
    ],
  }),
  component: Party,
});

function Party() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const rooms = useSuspenseQuery(roomsQuery);
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-32 text-center md:px-8">
      <Users className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-4 text-5xl font-bold">Watch Party</h1>
      <p className="mt-3 text-muted-foreground">
        Nonton bareng teman dengan chat langsung.
      </p>
      {user ? (
        <form
          className="mx-auto mt-8 flex max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) navigate({ to: "/party/$code", params: { code: code.trim().toUpperCase() } });
          }}
        >
          <Input placeholder="Party code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button type="submit" variant="hero">Join</Button>
        </form>
      ) : (
        <Button asChild variant="hero" className="mt-8"><Link to="/login">Sign in to join</Link></Button>
      )}
      <AdSlot placement="party_directory_top" />
      <section className="mt-10 text-left">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-2xl font-semibold"><Globe className="text-primary" /> Public rooms</h2><Button variant="ghost" size="icon" aria-label="Refresh public rooms" onClick={()=>void rooms.refetch()}><RefreshCw /></Button></div>
        {rooms.data.length===0 ? <p className="py-8 text-muted-foreground">No public rooms are watching right now.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rooms.data.map(room=><div key={room.code} className="space-y-4 rounded-lg border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-xs text-primary"><Globe className="h-4 w-4" /> Live · {room.viewers} watching</p><h3 className="font-display text-xl font-semibold">{room.title || "Watch Party"}</h3>
          {room.media_type==="tv" && <p className="text-sm text-muted-foreground">Season {room.season ?? 1} · Episode {room.episode ?? 1}</p>}
          <Button asChild variant="hero" size="sm">{user ? <Link to="/party/$code" params={{code:room.code}}><Play /> Join room</Link> : <Link to="/login"><Users /> Sign in to join</Link>}</Button>
        </div>)}</div>}
      </section>
      <AdSlot placement="party_directory_bottom" />
    </div>
  );
}
