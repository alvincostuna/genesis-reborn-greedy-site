# PHASE D BRIDGE CLOSURE — 2026-10-06

## Status

**PHASE D — PASS / CLOSED**

The GENESIS Admin Core → Platform bridge completed full end-to-end verification with **12/12 live diagnostics passing** and **0 failures**.

Final live Bridge Health state:
- Platform connected: PASS
- Bridge Health: PASS
- Core mode: READ ONLY
- Direct `genesis_private` access: DENIED
- Credential exposure: SECRET ONLY
- Write bridge: NOT PERMITTED
- Platform Auth: REQUIRED
- Health source: LIVE ENDPOINT CHECKS
- Phase-D bridge gate: PASS

## Scope

This closure covers the Admin migration bridge between:
- **GENESIS CORE** — canonical production/story database
- **GENESIS PLATFORM** — Admin/control-plane database and Admin runtime

This closure does **not** authorize story-production mutation, production resumption, release launch, Codex mutation cutover, or any other held production gate.

## Final 12/12 Bridge Health Diagnostics

| Diagnostic | Final result |
|---|---|
| Auth boundary | PASS — unauthenticated Production Status request rejected with HTTP 401 |
| Production Status | PASS — HTTP 200 |
| Roadmap | PASS — HTTP 200 |
| Continuity | PASS — HTTP 200 |
| Authorities | PASS — HTTP 200 |
| Manuscripts Index | PASS — HTTP 200 |
| Manuscript Version | PASS — HTTP 200 |
| World Summary | PASS |
| World Database | PASS |
| World Detail | PASS |
| Atlas Gate | PASS |
| Codex Read | PASS — HTTP 200 |

## Core Bridge Security Boundary

The final verified Core bridge login model remains:

- `genesis_bridge_login` may authenticate to Core.
- `genesis_bridge_login` inherits the intended `genesis_bridge_reader` role.
- `genesis_bridge_reader` is not a login role.
- Neither bridge role is SUPERUSER.
- Neither bridge role has CREATEROLE.
- Neither bridge role has CREATEDB.
- Neither bridge role has BYPASSRLS.
- Neither bridge role is a member of `service_role` or `postgres`.
- Direct `genesis_private` schema usage is denied.
- Direct `genesis_private` SELECT is **0**.
- Direct `genesis_private` INSERT is **0**.
- Direct `genesis_private` UPDATE is **0**.
- Direct `genesis_private` DELETE is **0**.
- Direct `genesis_private` TRUNCATE is **0**.
- Core bridge exposure is limited to curated `genesis_bridge` read surfaces and narrow bridge wrapper functions.

## Approved Curated Core Read Surfaces

The bridge reader was previously verified against the approved read surface set:

1. `atlas_gate_v1`
2. `authorities_v1`
3. `codex_reveal_index_v1`
4. `continuity_v1`
5. `item_detail_v1`
6. `manuscript_versions_v1`
7. `manuscripts_index_v1`
8. `map_detail_v1`
9. `monster_detail_v1`
10. `production_status_v1`
11. `roadmaps_v1`
12. `world_database_index_v1`
13. `world_database_summary_v1`

## Narrow Protected Detail Wrappers

To preserve the read-only security boundary without granting the bridge login broad Admin RPC execution, the protected detail path was repaired with narrow `genesis_bridge` SECURITY DEFINER wrappers:

- `monster_detail_payload_v1(uuid)`
- `map_detail_payload_v1(uuid)`
- `item_detail_payload_v1(uuid)`
- `atlas_gate_payload_v1(uuid)`

The bridge login does **not** receive direct EXECUTE on:
- `public.genesis_admin_entity_detail_v2(text, uuid, text)`
- `public.genesis_admin_atlas_gate_detail(text, uuid)`

The bridge login executes only the narrow bridge wrappers needed by the curated detail views.

## World Projection Repair Record

Phase-D QA exposed a nested execution-context failure in the World Database projection chain.

The following private read-projection views were hardened to execute under their owner/definer context rather than forcing the restricted bridge caller to inherit private-view permission checks:

- `genesis_private.admin_game_database_expanded_index_v2`
- `genesis_private.equipment_simulator_readiness_v3`
- `genesis_private.equipment_candidate_truth_audit_v1`
- `genesis_private.equipment_progressive_balance_metrics_v1`

These changes did **not** grant the bridge role direct `genesis_private` access.

Post-repair Core projection sanity checks:
- World Summary: **43 rows**
- World Index: **12,192 rows**

## Codex Cutover State

Codex read cutover remains:
- Core baseline: **41**
- Platform projection: **41**
- Distinct Core IDs: **41**
- `CORE_BACKFILL`: **41/41**
- `read_cutover`: **SYNCED**
- `mutation_cutover`: **HOLD**

No Codex mutation cutover was enabled by Phase D.

## Platform RPC Hardening

The six Platform SECURITY DEFINER RPCs were tightened:
- PUBLIC/anonymous execution removed.
- `search_path` locked.
- Release-audit helper restricted to `service_role`.
- Admin-facing RPCs retain only the authenticated Admin path they require plus `service_role`.
- Admin authorization checks remain inside the functions.

The obsolete public bridge diagnostic page was retired and replaced with a JWT-protected HTTP 410 tombstone.

## Admin Runtime / Bridge Health

The protected Admin preview runtime was upgraded to a live full-bridge diagnostic surface.

Runtime fingerprint:
- **PHASE-D-FULL-BRIDGE-V1**

Bridge Health no longer uses the obsolete hardcoded `4/4 VERIFIED` status. It performs live checks across all Phase-D bridge paths and fails closed if any check fails.

Protected Admin assets are served with:
- `Cache-Control: no-store, private`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`

No service worker / CacheStorage layer is used by the Admin runtime.

## Controls That Must Remain Locked

The following are explicit invariants after Phase-D closure:

1. **No direct browser access to Core database credentials.**
2. **No `GENESIS_CORE_DB_URL` exposure to client code.**
3. **No direct `genesis_private` grants to bridge roles.**
4. **No Core write bridge through the Admin migration path.**
5. **No INSERT / UPDATE / DELETE / TRUNCATE privileges for bridge roles on Core canonical/private relations.**
6. **No broad Admin RPC EXECUTE grants to bridge roles when a narrow wrapper is sufficient.**
7. **Platform Admin authentication remains required.**
8. **Bridge Health must fail closed on endpoint failures.**
9. **Codex mutation cutover remains HOLD until separately authorized.**
10. **Production gates remain independent from this migration closure.**
11. **No production/story mutation is implied by Phase-D PASS.**
12. **Live/production Core data must not be reset, deleted, repurposed, or used for destructive testing.**

## Closure Decision

Phase D is formally closed because:
- all 12 live bridge diagnostics passed;
- World Summary, World Database, World Detail, and Atlas Gate all passed after repair;
- the Core read-only boundary remained intact;
- direct private-schema access remained denied;
- no write authority was introduced;
- Admin authentication remained mandatory;
- the full Bridge Health runtime reported PASS.

**Decision: PHASE D — PASS / CLOSED.**

Any future change to Core bridge views, wrapper functions, Platform bridge functions, bridge-role grants, or Admin bridge routing must re-run the full **PHASE-D-FULL-BRIDGE-V1** diagnostic gate before promotion.
