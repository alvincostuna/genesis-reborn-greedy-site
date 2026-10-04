# GENESIS Admin Migration Audit — Manuscripts + Remaining Legacy Calls

Date: 2026-10-04
Scope: Admin control-plane migration from legacy single-Core API coupling to Core + GENESIS PLATFORM.
Safety: NON-DESTRUCTIVE. No Core records, production runs, manuscripts, roadmap rows, authorities, or bridge grants are mutated by this plan.

## Status

Completed bridge migration:
- Production -> genesis-production-status
- Roadmap -> genesis-roadmap
- Continuity -> genesis-continuity
- Authorities -> genesis-authorities

Next Core migration:
- Manuscripts

## Manuscripts: current legacy dependency

The current Admin Manuscripts screen still relies on these legacy Core Admin routes:

1. GET /admin/api/manuscripts
   - RPC: genesis_admin_manuscript_index
   - Purpose: filtered Part index
   - Filters: saga, episode, state, q, limit, offset

2. GET /admin/api/manuscripts/:part_id/versions/:stage
   - RPC: genesis_admin_manuscript_version
   - Purpose: read Stage 1, Stage 2, or Final Canon body + metadata

3. GET /admin/api/manuscripts/:part_id/compare?from=...&to=...
   - RPC: genesis_admin_manuscript_compare
   - Purpose: side-by-side version comparison

4. GET /admin/api/manuscripts/:part_id/preview?stage=...
   - RPC: genesis_admin_manuscript_version
   - Purpose: protected reader-style preview

5. GET /admin/api/manuscripts/:part_id
   - RPC: genesis_admin_manuscript_detail
   - Purpose: Part detail / metadata

The current browser UI depends on these fields in the index:
- production_part_id
- part_key
- title
- dashboard_state
- stage1_available
- stage2_available
- final_canon_available
- stage2_word_count

The version viewer currently depends on:
- stage
- version_number
- word_count
- content_hash
- source_system
- created_by_engine
- continuity_verified
- qa_verified
- body_text

## Manuscript bridge contract

Do NOT expose raw genesis_private tables.

Create curated Core bridge views/functions with narrowly scoped columns.

### A. genesis-manuscripts-index

Purpose:
- filtered/paginated manuscript index
- no manuscript body text

Recommended Core bridge surface:
- genesis_bridge.manuscripts_index_v1

Required returned columns:
- production_part_id
- roadmap_version_id
- saga_number
- episode_number
- part_number
- part_key
- title
- dashboard_state
- stage1_available
- stage2_available
- final_canon_available
- stage1_word_count
- stage2_word_count
- final_word_count
- latest_stage
- updated_at

Allowed query parameters at the Edge Function layer:
- q
- episode
- saga
- state
- limit (max 200)
- offset

All query inputs must be parameterized. No dynamic table/schema names.

### B. genesis-manuscript-version

Purpose:
- return one version of one Part
- protected Admin-only manuscript body read

Recommended Core bridge surface:
- genesis_bridge.manuscript_versions_v1

Allowed selectors:
- part_id UUID
- stage enum: stage1 | stage2 | final

Required returned columns:
- production_part_id
- part_key
- title
- stage
- version_number
- word_count
- content_hash
- source_system
- created_by_engine
- continuity_verified
- qa_verified
- created_at
- body_text

Security:
- admin JWT required
- active admin_users row required
- bridge login SELECT only
- GET only
- no update/insert/delete
- do not expose unpublished manuscripts to reader/public Auth

### C. comparison

Do not create a special Core write/RPC dependency.
The Platform Edge Function can fetch two allowed manuscript-version rows and return:
- from
- to

The browser can retain the current paragraph-level diff rendering.

### D. preview

Preview should reuse genesis-manuscript-version.
No separate Core permission is required.
The Admin frontend renders the returned protected body in the preview dialog.

### E. manuscript detail

Only create a separate detail endpoint if fields beyond manuscripts_index_v1 are actually needed.
Do not duplicate the whole Core record into Platform.

## Manuscript migration gates

A Manuscripts migration is not complete until all five pass:

1. DATA PARITY
   - Index row counts match the legacy RPC for equivalent filters.
   - Part keys/titles/stage availability/word counts match.
   - Version metadata and content_hash match.
   - body_text hash matches for sampled Stage 1, Stage 2, Final Canon rows.

2. AUTH / RBAC
   - Missing Platform JWT -> 401
   - non-admin Platform user -> 403
   - inactive admin -> 403
   - active admin -> permitted

3. READ-ONLY BOUNDARY
   - bridge login has SELECT only on manuscript bridge surfaces
   - no USAGE/SELECT on genesis_private
   - no INSERT/UPDATE/DELETE/TRUNCATE
   - no SECURITY DEFINER path that broadens access

4. UI PARITY
   - search works
   - Episode filter works
   - Stage 1/Stage 2/Final tabs work
   - Compare S1 <-> S2 works
   - Preview as Reader works
   - mobile reader view still works or gets an explicit replacement

5. FAILURE ISOLATION
   - manuscript bridge failure affects Manuscripts only
   - Command shell remains usable
   - Platform-native areas remain usable
   - clear local error/reconnect state

## Remaining legacy Admin-call audit

### CORE-BACKED: migrate through curated read-only bridge

Manuscripts
- /admin/api/manuscripts?
- /admin/api/manuscripts/:part/versions/:stage
- /admin/api/manuscripts/:part/compare
- /admin/api/manuscripts/:part/preview
- /admin/api/manuscripts/:part

World Database / Core entities
- /admin/api/database/summary
- /admin/api/database?
- /admin/api/database/detail/*
- /admin/api/atlas-gates/*
- Core-facing portions of /admin/api/database/proposals

Art/Codex canonical references
- any canonical Core entity lookup used by Art Assets
- canonical entity lookup used by Codex projection

These must not be bulk-copied into Platform solely for Admin convenience.

### PLATFORM-NATIVE: should move to GENESIS PLATFORM, not Core bridge

Identity / Admin
- /admin/api/rbac
- /admin/api/rbac/principals
- /admin/api/rbac/audit
- /admin/api/rbac/bootstrap
- /admin/api/rbac/permissions

Readers
- /admin/api/readers?
- /admin/api/readers/:id
- /admin/api/readers/advance-grants/*

Community
- /admin/api/community?limit=200
- /admin/api/community/fan-posts/*
- /admin/api/community/comments/*
- /admin/api/community/reports/*

Messages
- /admin/api/messages
- /admin/api/messages/:id/reply

Support / Settings
- /admin/api/support/summary
- /admin/api/settings/features
- /admin/api/settings/features/*
- /admin/api/settings/payment-provider
- /admin/api/settings/payments

Art workflow
- /admin/api/art-assets
- asset staging/review/publication metadata

These belong on the Platform control plane and should eventually stop calling Core entirely.

### PLATFORM CONTROL PLANE / RELEASE WORKFLOW

- /admin/api/releases
- /admin/api/release-policy
- /admin/api/releases/launch-preview
- /admin/api/releases/verify-live-site
- /admin/api/releases/pause
- /admin/api/releases/resume
- /admin/api/releases/authorize-launch
- /admin/api/releases/:id/*

- /admin/api/website-ops

Target:
- Platform-owned release queue/state
- Platform-owned website operational state
- Core contributes only canonical publication eligibility through curated read-only facts

### DEPRECATED LEGACY CORE READS ALREADY REPLACED

The new Admin screen code no longer needs legacy reads for:
- /admin/api/production
- /admin/api/roadmap
- /admin/api/continuity
- /admin/api/authority

Legacy Worker handlers may remain temporarily for rollback/history, but should be marked deprecated and removed only after parity and rollback windows close.

## Migration order from this audit

1. Manuscripts
2. World Database read surfaces
3. Platform-native RBAC / Readers / Community / Messages / Support
4. Releases + Website control plane consolidation
5. Art + Codex projection split
6. Deprecate remaining legacy Core Admin routes
7. Remove legacy RPC dependencies after final parity audit

## Hard rules

- No destructive Core migration.
- No production data copy to Platform unless the copy has a specific operational purpose and lifecycle.
- No service-role or postgres credential in browser code.
- No Core direct private-table access from Platform.
- No bridge write endpoint.
- No weakening admin JWT verification for convenience.
- Core quota/restriction must not disable Platform-native Admin areas.
