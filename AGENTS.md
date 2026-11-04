<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Watch-page extras reuse catalog details, fetch real season episodes and movie recommendations through TMDB server functions, and keep episode playback coordinates in the URL so selection survives refresh.
- TMDB is only called from server functions in src/lib/tmdb.functions.ts so the key stays server-side.
- Viewing is public and free; viewing.ts tests guest/banned-account and active-server rules, while RLS restricts public sources to active servers and admin writes to has_role.
- Stateless public clients with an optional session declare Authorization in global headers as well as the fetch shim, so Auth verifies signed-in sessions rather than rejecting them locally as missing.
- Roles live in public.user_roles only; the first signup becomes admin via the handle_new_user trigger.
- Admin writes go through src/lib/admin.functions.ts, which checks has_role and writes admin_audit_log.
- Video servers with base_url "storage://<bucket>" serve signed URLs from private storage; others resolve path against base_url.
- Playback URL templates and positive TMDB/episode validation live in playback-url; public playback verifies any supplied session and ban status, then adds the authorized default embed before active RLS-filtered admin sources. Private storage URLs are signed only after this source check.
- Default movie/TV embed templates live in the singleton site settings; audited admin-only writes require rights confirmation and shared validation, and configurable default embeds are never fetched server-side to prevent SSRF.
- Ads use validated image/text creatives without executable HTML; admin writes stay in admin.functions.ts with role checks and audit logs, and shared AdSlot/Preroll rendering also powers placement previews.
- Advertisement placement options and validation derive from AD_PLACEMENTS; each supported location is mounted explicitly on its page and represented in the admin preview to keep configuration and rendering consistent.
- Trusted TMDB responses persist in media_catalog; full detail snapshots are read publicly with RLS, while admin video sources reference catalog_id and distinguish direct video from licensed embeds.
- Catalog reads expose only published metadata; public site settings are limited to the active singleton row, so future unpublished or auxiliary records stay private.
- Watch Party uses authenticated join RPCs, bcrypt PIN hashes in a locked secrets table, durable memberships and rate-limited PIN attempts; only active public rooms are listed. Room chat, presence and host playback state use membership-protected database reads with short polling rather than unprotected broadcast topics, so private room codes alone grant no access. Existing invite-only links remain usable.
- Hover previews share a single token owner; dismissal invalidates pending fetches and removes the trailer iframe to prevent stale playback.
- Automated catalog sync uses authenticated managed callbacks, official TMDB ID exports, a durable hydration queue and overlapping changes polling; bounded batches and database leases preserve progress without exposing credentials.
