# GENESIS Website/Admin — Production Readiness Gate

Version: PRG-V1  
Owner: Website/Admin Builder  
Scope: official reader site + protected Admin Control Center  
Source lineage baseline: `main@60114bf4612c978c98ee3df245845a633600eb3e`

## Purpose

Production readiness is evidence-based. A component is not considered complete because it exists in HTML/CSS, appears in a mockup, or has a backend table. It must be implemented, connected to the correct authority, tested, and verified in the deployed candidate.

## Gate states

- **BLOCKED** — any Stop-Ship or Severity-1 requirement is open, or any mandatory gate returns FAIL/UNKNOWN.
- **CANDIDATE_READY** — all Stop-Ship/S1 items are closed and all automated checks pass; live deployment still requires the existing `genesis-live` environment approval.
- **PRODUCTION_READY** — candidate deployment passed, live smoke verification passed, rollback point is known, and there are no unresolved mandatory findings.
- **FINISHED_TARGET** — PRODUCTION_READY plus all user-visible controls shown in the approved design are functional (or intentionally removed), with no misleading placeholder behavior.

## Non-negotiable rule

No percentage, "done", or "production ready" claim may be made from source inspection alone. Each required item needs one of:

1. workflow/run evidence,
2. deterministic test output,
3. deployed candidate/live smoke evidence,
4. a documented Commander-approved exception.

## Mandatory gate

### G1 — Source and branch integrity

PASS requires:

- Public production source is identified and pinned to a commit SHA.
- Protected Admin source is reconciled with the current public lineage or has a reviewed, documented delta.
- No blind merge of a heavily diverged Admin branch.
- Every Admin-only delta that must survive is inventoried before reconciliation.
- The release candidate is built from one declared source SHA.

Current red-team finding:
- `feat/admin-manuscript-viewer` is diverged from `main` (218 commits ahead / 250 behind at audit time). This is **S1 / BLOCKING** until reconciled or deliberately replaced.

### G2 — Public/Admin security isolation

PASS requires:

- Public Worker returns 404 for `/admin/`.
- Public deployment contains no Admin service-role / Cloudflare Access private bindings.
- Admin Worker validates Cloudflare Access identity and server-side RBAC.
- Service-role secrets are server-side only.
- CSP, HSTS, `nosniff`, Referrer-Policy remain present.
- No public endpoint exposes private manuscript, authority, unreleased roadmap, exact hidden timers, or Admin audit data.

Any failure here is **Stop-Ship**.

### G3 — No dead or misleading controls

Every visible control must either work or be intentionally hidden/disabled with honest copy.

PASS requires:

- Global Search works end-to-end, or the search control is removed from production UI.
- Notification bell opens a real notification state/inbox, or the bell is removed.
- Fan upload controls are not presented as active if uploads remain disabled.
- Support/payment controls clearly reflect live/test/unavailable state.
- No button links to placeholder or preview-only behavior.

### G4 — Authoritative homepage data

PASS requires:

- Next Release time/Part is driven by the authoritative release queue/state when present.
- Client schedule logic may provide fallback display only; it may not override an Admin-scheduled exception.
- Currently Reading resumes the authenticated reader's exact Episode/Part/progress.
- Latest Releases is Part-level and uses real publish timestamps/status.
- Announcements are Admin-managed or explicitly labeled static/editorial.
- Access/Tier/EXP/active quest/collectible counts are sourced from real reader state.
- The public UI never reveals candidate/noncanon or unreleased content.

### G5 — Account/auth flows

PASS requires deterministic tests for:

- sign in / sign out,
- email verification state,
- forgot password,
- reset/change password,
- invalid/expired recovery path,
- logged-out protected account behavior,
- Tier/EXP display using the current 2,000 EXP rule,
- safe API failure fallback.

No real user credentials are used in visual fixtures.

### G6 — Desktop/mobile UI regression

PASS requires at minimum:

- Home
- Read
- World
- Codex
- Fan Page
- Manga
- Support
- Account
- Quests

at desktop and mobile viewports with:

- HTTP/render success,
- no unintended horizontal overflow,
- no unhandled page exceptions,
- functional primary navigation,
- mobile bottom navigation,
- reader text sizing/fullscreen regression,
- profile/access cards not clipped,
- final hero and locked asset checks.

### G7 — Admin regression

PASS requires:

- Cloudflare Access gate reachable only on protected Admin hostname.
- RBAC denial tests for unauthorized roles.
- Production, Manuscripts, Release Queue, Roadmap, Continuity, Authority, Game Database, Codex, Readers, Community, Support/Messages core screens load.
- Dangerous mutations require explicit guarded actions.
- Website Builder changes do not resume AI-2 or mutate story-production state.
- Admin mobile/tablet layout is usable for critical controls.

### G8 — CI coverage

PASS requires:

- TypeScript type check.
- Browser JavaScript syntax check.
- Production-readiness audit script.
- Desktop/mobile visual QA.
- Security/static contract checks.
- Main/release-candidate branches are covered by CI, not only historical feature branches.
- A failed mandatory check blocks readiness.

### G9 — Candidate deployment

PASS requires the existing `deploy-live.yml` safeguards plus:

- candidate URL returns 200 for public routes,
- `/admin/` remains 404,
- locked assets resolve,
- no `/site-preview/` leaks,
- security headers pass,
- current source SHA is recorded,
- candidate smoke output is retained.

### G10 — Live verification and rollback

PASS requires after promotion:

- all public routes return expected status,
- home contains current release/user-safe markers,
- search/notifications behave according to production contract,
- account recovery endpoints smoke-test safely,
- `/admin/` remains unavailable on public host,
- protected Admin host remains protected,
- previous deployment/version is identified for rollback.

## Stop-Ship conditions

Immediate BLOCKED regardless of visual quality:

- private/Admin secret exposed to public Worker,
- public access to protected manuscript/admin data,
- destructive mutation of story-production truth,
- wrong/unsafe release state that can publish unreleased content,
- authentication bypass,
- Cloudflare Access/RBAC bypass,
- irrecoverable deployment with no rollback,
- candidate/noncanon content exposed as canon.

## Evidence packet required for PRODUCTION_READY

A readiness decision must attach:

- source commit SHA,
- Admin reconciliation SHA/strategy,
- readiness workflow run,
- desktop/mobile screenshots,
- candidate deployment smoke log,
- security-header checks,
- account/auth smoke summary,
- open-findings list (must contain no Stop-Ship/S1),
- rollback version/deployment identifier.

## Current gate state

**BLOCKED**

Reason: current red-team audit has open S1 findings, especially Admin/public branch divergence, disabled Search, non-functional notification surface, incomplete authoritative homepage binding, and insufficient current-head deployment evidence.

