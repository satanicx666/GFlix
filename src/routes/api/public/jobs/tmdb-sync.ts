import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { z } from "zod";

export const Route = createFileRoute("/api/public/jobs/tmdb-sync")({
  server: { handlers: { POST: async ({ request }) => {
    const failure = await authenticateCronRequest(request);
    if (failure) return failure;
    const input = z.object({ type: z.enum(["movie", "tv"]), kind: z.enum(["export", "hydrate", "changes"]) }).safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Invalid job" }, { status: 400 });
    const { syncCatalog } = await import("@/lib/catalog-sync.server");
    try { return Response.json(await syncCatalog(input.data.type, input.data.kind)); }
    catch { return Response.json({ error: "TMDB synchronization failed; saved progress retained" }, { status: 503 }); }
  } } },
});