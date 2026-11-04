import { Link } from "@tanstack/react-router";
import { Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isResumable, progressOf, readEntries, removeEntry, type ContinueEntry } from "@/lib/continue-watching";
import { tmdbImg } from "@/lib/img";

const fmt = (sec: number) => {
  const m = Math.max(0, Math.round(sec / 60));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

export function ContinueWatching() {
  const [items, setItems] = useState<ContinueEntry[]>([]);
  useEffect(() => {
    const load = () => setItems(readEntries().filter(isResumable));
    load();
    window.addEventListener("continue-watching", load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener("continue-watching", load); window.removeEventListener("storage", load); };
  }, []);
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="px-4 text-xl font-bold md:px-8 md:text-2xl">Lanjutkan Menonton</h2>
      <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-2 md:px-8">
        {items.map((it) => {
          const img = tmdbImg(it.backdrop ?? it.poster, "w780");
          const pct = Math.round(progressOf(it) * 100);
          return (
            <div key={it.key} className="group relative w-[85vw] shrink-0 sm:w-[26rem] lg:w-[30rem]">
              <Link to="/watch/$type/$id" params={{ type: it.type, id: String(it.id) }} search={it.type === "tv" ? { s: it.season, e: it.episode } : {}} className="block" aria-label={`Lanjutkan ${it.title}`}>
                <div className="relative aspect-video overflow-hidden rounded-xl bg-card ring-primary/70 transition group-hover:ring-2">
                  {img && <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
                    <p className="line-clamp-1 text-lg font-bold drop-shadow md:text-xl">{it.title}</p>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Play className="h-3.5 w-3.5 fill-current" /> Lanjutkan</span>
                      <span className="text-xs text-muted-foreground">
                        {it.type === "tv" ? `S${it.season} · E${it.episode}` : "Film"}{it.duration ? ` · sisa ${fmt(it.duration - it.currentTime)}` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-foreground/20"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 2)}%` }} /></div>
                  </div>
                </div>
              </Link>
              <button type="button" aria-label={`Hapus ${it.title}`} onClick={() => removeEntry(it.key)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/70 text-foreground transition hover:bg-background md:opacity-0 md:group-hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
