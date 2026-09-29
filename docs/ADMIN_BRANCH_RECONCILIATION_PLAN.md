# GENESIS Website/Admin — Branch Reconciliation Plan

Version: ADMIN-RECON-V1  
Owner: Website/Admin Builder  
Issue: #15  
Strategy: **forward-port protected Admin capabilities onto current main; never merge the old Admin branch wholesale**

## Frozen source points

- Current public main baseline: `60114bf4612c978c98ee3df245845a633600eb3e`
- Protected Admin head: `4bbf7c4dce74113aa85d97b6dbcc0d4181c3a3f4`
- Merge base: `e201d7ec8a141234813eb925e90296c6af0745e6`
- Divergence at audit:
  - main-only: **250 commits**
  - Admin-only: **218 commits**
- Clean reconciliation branch already created from main:
  - `website-admin-reconcile-v1`

## Why a normal merge is prohibited

The Admin branch is not simply "main plus Admin."

The compare contains **43 changed files**:
- 6 Admin UI/runtime files,
- 19 static voice-revision manuscript files,
- 10 public-site files,
- 3 workflow files,
- 2 Worker files,
- 2 package/live configuration files,
- 1 deployment trigger file.

The older Admin branch also differs from current main in public behavior. For example:

- current main `src/public-worker.ts` contains the public `/quests` route;
- the Admin branch copy does not;
- current main `wrangler.live.toml` has `run_worker_first = true`;
- the Admin branch copy does not.

A wholesale merge can therefore regress the public reader even if the Admin UI itself improves.

## Reconciliation principle

**Main wins for public reader behavior.  
Admin branch wins only for proven protected-Admin capabilities.  
Supabase wins for story/manuscript truth.**

No static manuscript copy in Git becomes authoritative.

## File classification

### A — PORT: protected Admin capability

Port selectively into `website-admin-reconcile-v1`:

- `public/admin/index.html`
- `public/admin/admin.css`
- `public/admin/admin.js`
- `public/admin/read/index.html`
- `public/admin/read/reader.css`
- `public/admin/read/reader.js`
- Admin-specific portions of `src/worker.ts`
- the useful protected-preview deployment behavior from `.github/workflows/deploy-admin-preview.yml`
- useful safety/concurrency improvements from `.github/workflows/admin-preview.yml`

These are not copied blindly. Each batch is ported onto current main and tested.

### B — KEEP MAIN: public reader authority

Do not replace these with the older Admin branch copies:

- `public/site-preview/index.html`
- `public/site-preview/site.css`
- `public/site-preview/site.js`
- all current `public/site-preview/*/index.html` pages
- `src/public-worker.ts`
- `wrangler.live.toml`
- `.github/workflows/deploy-live.yml`
- `package.json` unless a specific Admin dependency is proven necessary

Reason: current main contains later reader/auth/release changes. Public files are reconciled by targeted feature port only, never branch replacement.

### C — EXCLUDE from reconciled website runtime

Do not port:

- `public/admin/voice-revisions/*.txt`
- `deploy/admin-preview-voice-repair-trigger.txt`

Reason:
- Website/Admin Builder is separate from story production.
- Live Supabase is authoritative for production manuscript state.
- Static repair/manuscript snapshots can become stale and create two sources of truth.
- Admin manuscript viewer should read authorized backend data through guarded RPC/API rather than ship production prose as static website assets.

If historical preservation is needed, archive outside runtime assets; do not deploy as active Admin content.

### D — MANUAL REVIEW ONLY

Review but do not auto-port:

- public-site CSS/JS deltas that exist only on the Admin branch,
- any `src/worker.ts` hunk that changes public APIs rather than Admin APIs,
- package/version changes,
- Cloudflare config differences.

Port only if the capability is missing from current main and passes the new readiness gate.

## Batch plan

### Batch R0 — baseline
No functional change.

- branch: `website-admin-reconcile-v1`
- confirm current main typecheck/JS syntax
- confirm public `/admin/` blocking remains in source
- record baseline screenshots/build

Exit: baseline green.

### Batch R1 — Admin shell/UI

Port:
- Admin HTML
- Admin CSS
- Admin JS

Do not yet port Worker/API changes.

Tests:
- JS syntax
- desktop Admin render
- mobile/tablet Admin render
- no public-site file changes

Exit: Admin UI builds on current main.

### Batch R2 — Admin manuscript reader

Port:
- `public/admin/read/*`

Explicitly do **not** port `public/admin/voice-revisions/*.txt`.

Reader must obtain manuscript content from protected backend endpoints/RPC.

Tests:
- Access gate
- authenticated read
- unauthorized denial
- no static production prose in assets

Exit: protected reader works without a second source of truth.

### Batch R3 — Admin Worker/API capabilities

Selectively port Admin routes and authorization logic from old `src/worker.ts`.

Rules:
- preserve current Cloudflare Access validation,
- preserve Supabase RBAC,
- no new public route unless separately reviewed,
- no destructive production mutation added implicitly,
- service-role never reaches browser/public Worker.

Tests:
- unauthorized 401/403
- role denial
- allowed Admin read
- guarded write/proposal path
- audit entry
- public Worker unchanged

Exit: Admin capability parity.

### Batch R4 — protected Admin deployment

Create one authoritative Admin-preview workflow for the reconciled branch.

Preserve:
- `genesis-admin-preview` environment,
- required binding-name verification,
- Cloudflare Access/401-or-302 verification,
- protected hostname verification,
- no public-live deployment.

Retire duplicate legacy deployment triggers after the new path is proven.

Exit: reconciled branch deploys protected Admin safely.

### Batch R5 — public regression

Run current public site unchanged against:
- Home
- Read
- World
- Codex
- Fan Page
- Manga
- Support
- Account
- Quests

Verify:
- `/quests` remains routed,
- `run_worker_first = true` remains in live config,
- public `/admin/` = 404,
- no Admin assets/secrets in public live package,
- V2/V3 auth/recovery/reward behavior remains intact.

Exit: no public regression.

### Batch R6 — parity and cutover

Compare reconciled branch to old Admin branch by capability, not commit count.

Checklist:
- Admin Control Center modules retained,
- manuscript viewer retained,
- Admin mobile behavior retained,
- protected deploy retained,
- current public features retained,
- static manuscript snapshots excluded,
- no known required Admin capability missing.

Then:
- point protected Admin workflow at reconciled lineage,
- run protected candidate,
- verify,
- only then retire `feat/admin-manuscript-viewer`.

## Required tests per batch

Every reconciliation batch must pass:

1. `npm run types`
2. `node --check public/site-preview/site.js`
3. `node --check public/admin/admin.js` when Admin JS is present
4. production-readiness source audit
5. public/Admin isolation checks
6. relevant desktop/mobile render checks

No batch may hide failures by weakening the gate.

## Rollback

Before each protected Admin deployment:
- record current protected Worker version/deployment,
- deploy candidate/preview only,
- verify Access + RBAC,
- retain previous version identifier.

If a batch fails:
- do not merge forward,
- return to prior reconciliation commit,
- do not touch public live.

## Definition of reconciled

S1-01 is DONE only when:

- the protected Admin is built from the reconciled current-main lineage;
- Admin capability parity is verified;
- public reader regression is zero;
- public/Admin security isolation passes;
- static manuscript/voice snapshots are not runtime truth;
- the old divergent branch is no longer required for deployment;
- the readiness divergence blocker is removed or updated to the new authoritative Admin branch.

