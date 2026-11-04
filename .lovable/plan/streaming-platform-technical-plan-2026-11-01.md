# Streaming Platform — Technical Plan

## Product decisions (from your answers)
- Playback uses only video you own or have licensed. Admins upload files or link to your own hosting. No third-party piracy embeds.
- TMDB supplies details (posters, cast, trailers, search, trending). A title can be played only when an admin has attached a licensed video to it.
- Premium passes, paid once (they do not renew): 1 day = Rp 5.000, 7 days = Rp ?, 30 days = Rp ? (prices needed). Premium removes ads; free members see ads.
- Look: warm amber on a dark background (#120d08 / #2a1f14 / #f5a524 / #fbf3e4).

## Roles
- Guest: browse, search, view details, watch trailers.
- Member: plays licensed videos with ads, keeps a watchlist, has an account page.
- Premium: no ads, and access to all video sources and the highest quality.
- Admin: full /admin access.

## Pages
- Public: `/`, `/movie/$id`, `/tv/$id`, `/search`, `/login`, `/register`, `/reset-password`, `/pricing`
- Member (gated): `/watchlist`, `/account`, `/watch/$type/$id`
- Admin (gated + role check): `/admin`, `/admin/users`, `/admin/servers`, `/admin/memberships`, `/admin/videos`

## "Play" flow
1. The user clicks Play on a details page. Guests are sent to sign in.
2. The server checks the user's tier and finds the active video sources for that TMDB id.
3. The server pings each source with a short request and picks the fastest healthy one, in priority order.
4. The player starts the video. Free members see an ad first, and the user can switch to another source.

## Technical details
- Backend: Lovable Cloud (database, auth, storage for video files). Email/password sign-in.
- Tables:
  - `profiles` (id, email, membership_tier, premium_until, created_at)
  - `user_roles` (user_id, app_role enum) plus the `has_role()` security definer function. Roles are never stored on the profile.
  - `watchlist` (user-scoped RLS)
  - `server_config` (name, base_url, is_active, priority, premium_only, last_latency_ms, last_checked_at)
  - `licensed_videos` (tmdb_id, media_type, season, episode, server_id, path/url, quality)
  - `payments` (user, plan, amount_idr, stripe_session_id, status)
  - `admin_audit_log` (every admin write logs a row)
- TMDB is called only through server functions using a `TMDB_API_KEY` secret, so the key is never exposed.
- Signed video URLs come from a protected server function, so tier rules are enforced on the server and not only in the page.
- Admin server functions use `requireSupabaseAuth` and run a `has_role` check before any privileged action.
- Stripe (built-in): Checkout runs as a one-time payment in IDR. A webhook sets `premium_until = max(now, premium_until) + N days`. The customer portal shows receipts.
- Health checks: admins can trigger them, and a scheduled server route refreshes latency.
- Tests: premium expiry math, tier gating for sources and ads, and pass pricing.

## Build order
1. Design system, layout, and TMDB browse/search/details pages
2. Cloud, auth, profiles/roles, and watchlist
3. Licensed video sources, fastest-source picker, player with ads
4. Admin panel and audit log
5. Stripe passes and the webhook
