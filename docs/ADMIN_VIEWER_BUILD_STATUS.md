# Admin Manuscript Viewer — Build Status

Branch: `feat/admin-manuscript-viewer`

## Database

Applied in the GENESIS Supabase project:

- `015_genesis_admin_manuscript_read_api`
- `015a_genesis_admin_dashboard_runtime_envelope`

Verified PRE-103 state remains:

- Stage 1 = 25/25
- Stage 2 = 25/25
- Final Canon = 0
- 103 = PENDING
- AI-2 = BLOCKED
- Release queue = 0
- Scheduled = 0
- Published = 0
- Releases = PAUSED

The new Admin read bridge returns exactly 25 current Parts and exposes Stage 1 / Stage 2 manuscript bodies only through server-side service-role RPCs. Anonymous EXECUTE permission is denied.

## GitHub branch

Implemented:

- Cloudflare Worker scaffold
- Cloudflare Access JWT verification
- server-side Supabase RPC calls
- Production Dashboard
- Manuscript Library
- Stage 1 / Stage 2 / Final Canon tabs
- Stage 1 vs Stage 2 comparison
- Preview as Reader
- Release Queue read-only view

## Safety

This repo does not yet contain the existing public GENESIS website source.

Do **not** bind this feature branch to the current production GENESIS domain. The Worker intentionally returns 404 for non-`/admin*` paths.

Before preview deployment configure:

1. Cloudflare Access for the preview `/admin*` route.
2. `CF_ACCESS_TEAM_DOMAIN`.
3. `CF_ACCESS_AUD`.
4. Cloudflare secret `SUPABASE_SERVICE_ROLE_KEY`.
5. A non-production preview hostname.

The real AI-1 103 closeout remains blocked until the website-first inspection gate passes.
