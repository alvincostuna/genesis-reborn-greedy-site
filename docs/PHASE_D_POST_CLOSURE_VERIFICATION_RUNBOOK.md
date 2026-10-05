# PHASE D POST-CLOSURE VERIFICATION RUNBOOK

Date: 2026-10-06  
Status: ACTIVE OPERATING RUNBOOK  
Related controls:
- `PHASE_D_BRIDGE_CLOSURE_20261006.md`
- `PHASE_D_POST_CLOSURE_VERIFICATION_CHECKLIST.md`
- `PHASE_E_ENTRY_CRITERIA.md`

## Objective

Provide an operator-ready procedure for re-verifying the GENESIS Core → Platform Admin bridge after any bridge-affecting change.

This runbook is verification-only unless a separately approved repair is required.

## Trigger conditions

Run this procedure after any change to:
- Core bridge views
- bridge wrapper functions
- Core bridge grants or role memberships
- Platform Edge Functions
- Platform SECURITY DEFINER RPCs
- Admin Bridge Health logic
- Admin auth/routing/runtime bindings
- Codex read synchronization
- World/Atlas detail paths
- protected Admin deployment configuration

Also run it before any Phase-E authorization decision.

## Stop conditions

Immediately mark **BLOCKED** and stop promotion if any of these occur:
- direct `genesis_private` access appears for a bridge role;
- any Core write privilege appears;
- bridge role gains SUPERUSER / CREATEROLE / CREATEDB / BYPASSRLS;
- Platform Admin auth is bypassed;
- Core credential exposure is suspected;
- any live Bridge Health diagnostic fails;
- deployment identity cannot be proven;
- rollback identifier is unknown.

## Step 1 — Capture change identity

Record:
- repository branch
- commit SHA
- migration name(s)
- Core project ref
- Platform project ref
- Worker version / workflow run
- operator
- verification timestamp
- rollback identifier

Do not continue without a rollback reference.

## Step 2 — Verify Core bridge roles

Check `genesis_bridge_login` and `genesis_bridge_reader`.

Required:
- login role can LOGIN;
- reader role cannot LOGIN;
- login inherits intended reader role;
- SUPERUSER=false;
- CREATEROLE=false;
- CREATEDB=false;
- BYPASSRLS=false;
- no membership in `service_role`;
- no membership in `postgres`.

Decision:
- all pass → continue;
- any fail → **BLOCKED**.

## Step 3 — Verify private-schema isolation

Check effective privileges for the bridge login.

Required:
- `genesis_private` USAGE=false;
- `genesis_private` CREATE=false;
- private SELECT=0;
- private INSERT=0;
- private UPDATE=0;
- private DELETE=0;
- private TRUNCATE=0.

Decision:
- all pass → continue;
- any fail → **BLOCKED**.

## Step 4 — Verify curated bridge surface

Confirm approved `genesis_bridge` read surfaces remain available and no unexpected relation is exposed.

Expected relations:
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

Expected narrow wrappers:
- `monster_detail_payload_v1(uuid)`
- `map_detail_payload_v1(uuid)`
- `item_detail_payload_v1(uuid)`
- `atlas_gate_payload_v1(uuid)`

Required:
- wrapper EXECUTE available to bridge reader;
- broad Admin RPC EXECUTE unavailable to bridge login;
- no write grants.

## Step 5 — Verify Core World projections

Run read-only checks against:
- `world_database_summary_v1`
- `world_database_index_v1`

Closure baselines:
- summary rows: **43**
- index rows: **12,192**

These counts are audit baselines, not immutable business invariants. A legitimate future content expansion may change them, but any change must be explained and reconciled before PASS.

Also sample:
- one World Detail entity;
- one Atlas Gate entity.

Check Core Postgres logs for permission errors.

Decision:
- clean read + explained counts → continue;
- permission error / unexplained drift → **BLOCKED**.

## Step 6 — Verify Codex parity

Compare Core and Platform.

Phase-D closure baseline:
- Core rows: **41**
- Platform rows: **41**
- distinct Core IDs: **41**
- `CORE_BACKFILL`: **41/41**
- `read_cutover`: **SYNCED**
- `mutation_cutover`: **HOLD**

Required:
- no duplicate Core IDs;
- required fields populated;
- counts match or justified by an approved later migration;
- mutation cutover remains HOLD unless separately authorized.

## Step 7 — Verify Platform security controls

Confirm:
- Platform Admin JWT required;
- inactive/non-admin identities rejected;
- `GENESIS_CORE_DB_URL` remains server-only;
- no Core service credential in browser code;
- Platform SECURITY DEFINER functions retain locked `search_path`;
- anonymous/PUBLIC EXECUTE is not reintroduced;
- obsolete public bridge-test page remains retired;
- Admin assets remain protected and no-store.

## Step 8 — Verify deployed Admin runtime

Confirm:
- protected Admin deployment workflow passed;
- exact deployed commit known;
- Worker version known;
- required bindings verified;
- stable protected hostname verified;
- current runtime fingerprint visible.

Current fingerprint:
**PHASE-D-FULL-BRIDGE-V1**

If the runtime cannot be tied to the intended commit, mark **BLOCKED**.

## Step 9 — Run the live Bridge Health gate

Open protected Admin → Bridge Health.

Run **Run Full Bridge Gates**.

Required diagnostics:
1. Auth boundary
2. Production Status
3. Roadmap
4. Continuity
5. Authorities
6. Manuscripts Index
7. Manuscript Version
8. World Summary
9. World Database
10. World Detail
11. Atlas Gate
12. Codex Read

Required result:
- **12/12 PASS**
- **0 FAIL**
- Core mode = READ ONLY
- Direct `genesis_private` access = DENIED
- Write bridge = NOT PERMITTED
- Platform Auth = REQUIRED
- final bridge gate = PASS

Any non-pass result = **BLOCKED**.

## Step 10 — Preserve evidence

Retain:
- screenshots of final Bridge Health state;
- Platform function-log timestamps;
- Core Postgres logs if failures occurred;
- Core role/privilege SQL result;
- Codex parity result;
- deployment run and Worker version;
- commit SHA;
- migration identifiers;
- final decision.

## Step 11 — Final verification decision

Choose exactly one:

### PASS
Use only when every mandatory security and runtime check passes.

### BLOCKED
Use when any gate fails or evidence is incomplete.

### PASS WITH APPROVED BASELINE CHANGE
Use only when counts or surfaces legitimately changed under a separately approved migration, security invariants still pass, and the new baseline is documented before promotion.

## Step 12 — Phase-E handoff

A successful post-closure verification does **not** itself authorize Phase E.

After PASS:
1. open the Phase-E go/no-go matrix;
2. classify proposed work;
3. confirm mutation level;
4. record approvals;
5. record rollback;
6. issue a separate Phase-E decision.
