# GENESIS Codex Read Cutover

Date: 2026-10-04
Status: READ MODEL PREPARED / CORE BACKFILL REQUIRED

## Authority split

CORE remains authoritative for:
- canonical entity identity
- canonical Part identity / first-use evidence
- Atlas gate evidence
- historical Codex reveal plans currently stored in Core
- any production/story fact used to decide what may be exposed

GENESIS PLATFORM owns:
- Codex Admin read model
- reader/public projection state
- future reveal workflow after mutation cutover
- audit and UI state

## Platform read model created

### public.codex_reveal_plans
Fields:
- id
- core_reveal_id
- entity_code / entity_id
- canonical_name / public_name
- part_key / part_title
- reveal_kind
- public_fields
- notes
- status
- executed
- first_use
- source_mode
- source_fingerprint
- created_at / updated_at

Admin read access is RLS-protected through private.is_admin().

### public.codex_projection_state
Fields:
- entity_code / entity_id
- current_gate
- projection_gate
- website_status
- reader_fields
- core_snapshot
- source_fingerprint
- synced_at / updated_at

Admin read access is RLS-protected through private.is_admin().

## Required Core read bridge before UI cutover

Create a curated Core bridge surface that exposes the legacy
genesis_admin_codex_reveal_index output without granting direct genesis_private access.

Recommended contract:

genesis_bridge.codex_reveal_index_v1

Minimum row shape:
- core_reveal_id
- entity_code
- entity_id
- canonical_name
- public_name
- part_key
- part_title
- reveal_kind
- public_fields
- notes
- status
- executed
- first_use
- updated_at

The surface must be SELECT-only for genesis_bridge_reader.
No direct grants on genesis_private.

## Read cutover sequence

1. Create Core genesis_bridge.codex_reveal_index_v1.
2. Validate bridge-reader SELECT and direct-private denial.
3. Deploy Platform Edge Function genesis-codex-read.
4. Edge Function authenticates GENESIS PLATFORM Admin JWT.
5. Edge Function reads Core bridge through GENESIS_CORE_DB_URL.
6. Backfill/upsert rows into public.codex_reveal_plans using core_reveal_id.
7. Build public.codex_projection_state from Core Atlas/read-only canonical evidence.
8. Switch Admin Codex GET path from /admin/api/codex/reveals to Platform read model.
9. Verify parity: counts, IDs, statuses, public_fields, first_use evidence.
10. Only after parity is proven may the old Codex GET route be removed.

## Mutation boundary

The following remain HOLD during read cutover:
- create reveal draft
- update draft
- approve
- retire

Current legacy mutation RPCs:
- genesis_admin_codex_reveal_create
- genesis_admin_codex_reveal_update
- genesis_admin_codex_reveal_approve
- genesis_admin_codex_reveal_retire

Do not redirect these writes into Core through the new Platform bridge.

The future mutation contract must write to Platform-owned workflow tables only, then use a separate reviewed projection/sync mechanism if Core canonical evidence must be updated.

## Remaining Core Admin API call map

Active legacy Codex calls in public/admin/admin.js:
- GET /admin/api/codex/reveals?limit=200
- POST /admin/api/codex/reveals
- POST /admin/api/codex/reveals/{id}/update
- POST /admin/api/codex/reveals/{id}/approve
- POST /admin/api/codex/reveals/{id}/retire

The previous /admin/api/rbac initialization dependency has been removed and replaced by platform_admin_access_summary.

After Codex read cutover completes, no active read path should depend on the old Core Admin API.
