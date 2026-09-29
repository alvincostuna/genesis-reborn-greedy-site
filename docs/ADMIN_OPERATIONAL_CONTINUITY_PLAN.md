# GENESIS Admin + Official Website Operational Continuity Plan

Version: OPS-CONTINUITY-V1  
Owner: Website/Admin Builder  
Scope: protected Admin Control Center + official public reader  
Production authority: live Supabase production system

## Objective

Production may continue independently. The Admin site and official website must already be prepared so that when story content reaches the correct production state, the website pipeline can receive it without requiring emergency code changes or manual copying.

The website must never become a second story-production system.

## Authoritative flow

```
AI-2 / AI-1 production
        │
        │ production tables remain authoritative
        ▼
FINAL_CANON production Part
        │
        │ existing DB trigger:
        │ trg_production_part_final_canon_queue
        ▼
HIDDEN release item
        │
        │ protected Admin review / readiness / schedule
        ▼
SCHEDULED release item
        │
        │ release engine, only when due and releases are active
        ▼
PUBLISHED public.story_parts
        │
        ├── official Read library
        ├── Latest Releases
        ├── reader progress
        └── public-safe Codex/World reveal application
```

## Existing live safeguards confirmed

The database already contains the key handoff mechanism:

- A production Part becoming `FINAL_CANON` with a current Final Canon version triggers `genesis_queue_final_canon_release()`.
- `ensure_release_item_for_part()` creates the release item as `HIDDEN`.
- The trigger is idempotent for the same Part and refreshes the canon pointer only while the item is still non-terminal.
- Published/withdrawn release records cannot silently accept a new canon pointer.
- `publish_release_item()` refuses publication unless:
  - releases are active,
  - the item is SCHEDULED,
  - publish time is due,
  - the production Part is still FINAL_CANON,
  - the Final Canon pointer matches,
  - roadmap metadata exists.
- Publication copies only the approved Final Canon version into public story tables.
- Public reveal logic executes at publication, not merely when a candidate exists.

This means the desired production→website pipeline already has a strong core. The Admin work should expose and monitor it rather than replace it.

## New read-only Website Ops contract

A dedicated read-only Admin status contract is now available:

`public.genesis_admin_website_ops_status()`

It reports the active production branch/roadmap, Stage-1/Stage-2/Final-Canon counts, handoff-integrity gaps, release queue counts, public publication counts, release controls, release clock, and current production-lock state.

Security rules:

- callable only through the protected Admin Worker/service-role path;
- not granted to anon/authenticated browser roles;
- no mutation capability;
- cannot resume AI-2;
- cannot change manuscript/story data;
- cannot publish a Part.

## Operational states

### PREPARED_RELEASES_PAUSED

Expected while production is still underway and public launch is not authorized.

Admin should show:
- production is progressing;
- story handoff integrity is PASS;
- no Final Canon exists yet, or Final Canon exists only in hidden queue;
- releases remain paused.

This is a healthy pre-launch state, not an error.

### PREPARED_AWAITING_LAUNCH_AUTHORIZATION

Final Canon/release queue may exist, but public launch is still unauthorized.

### OPERATIONAL_QUEUE_AVAILABLE

Release engine is allowed and hidden/ready items exist for Admin handling.

### OPERATIONAL_SCHEDULED

At least one valid Part is scheduled.

### REPAIR_REQUIRED

Only used when a Final Canon Part lacks a release item or a release item points at the wrong current Final Canon version.

This state blocks launch/scheduling decisions until repaired.

## Admin preparation requirements

The protected Admin must be able to operate before public release begins:

1. Production Dashboard — read current run/gates without taking control accidentally.
2. Website Ops — read-only production→release→public handoff health.
3. Manuscripts — inspect active Stage 1 / Stage 2 / Final Canon through protected API.
4. Mobile manuscript reader — no static manuscript snapshots; protected backend only.
5. Release Queue — hidden/ready/scheduled/published state.
6. Release policy/clock — Asia/Manila, 08:00 / 14:00 / 20:00 Monday–Saturday, Sunday rest.
7. Live-site verification — public homepage + public /admin=404 + security headers.
8. Access & Audit — Cloudflare Access + Supabase RBAC.
9. Public-safe Codex/reveal controls.
10. Reader/support/community operations.

## Smooth-production rule

Website/Admin preparation must not interrupt story production.

Allowed during active production:
- read-only monitoring;
- protected Admin UI/worker development;
- public-site code development;
- candidate deployments to isolated/protected Workers;
- new read-only website-support RPCs/views;
- QA, security regression, branch reconciliation.

Not allowed without explicit separate authorization:
- changing production routing;
- resuming/stopping AI-2 as part of website work;
- rewriting committed Parts;
- replacing production Final Canon;
- changing active production run;
- publishing unreleased story merely because a row exists.

## Release-time behavior

When the first legitimate Final Canon Part appears:

1. trigger creates HIDDEN release item automatically;
2. Website Ops must remain PASS;
3. Admin can inspect the Part;
4. release readiness can be evaluated;
5. schedule only after launch/release policy permits it;
6. public site remains unchanged until the release item becomes PUBLISHED;
7. once PUBLISHED, public library/latest-release/reader systems may consume it.

No source file copy, manual manuscript upload, or emergency website patch should be required.

## Failure policy

If production continues but the website is unavailable:

- production must continue independently;
- no story-production rollback is performed for a website outage;
- release engine can remain paused;
- release items remain hidden/scheduled according to policy;
- restore Admin/public site from last known good deployment;
- publish only after website health returns.

If website is healthy but production has no Final Canon:

- show waiting/pre-launch state;
- do not fabricate release content;
- do not expose Stage 1 or Stage 2 publicly.

## R1 reconciliation boundary

Current R1 work may change:

- `public/admin/**`
- protected Admin-only `src/worker.ts` routes
- reconciliation QA/docs

R1 must not change:

- `public/site-preview/**`
- `src/public-worker.ts`
- `wrangler.live.toml`
- live public deployment workflow
- production story rows/state

This boundary is enforced by `admin-reconciliation-qa.yml`.

## Definition of operationally prepared

The Admin/public system is prepared when:

- protected Admin builds from current-main lineage;
- mobile and desktop Admin are usable;
- Website Ops reports production handoff status;
- Final Canon auto-queue integrity passes;
- release queue controls remain protected;
- public website can stay live with zero published Parts;
- public website can accept published Parts without a code deployment;
- public/Admin isolation remains intact;
- production can continue even if website deployment work is paused.

