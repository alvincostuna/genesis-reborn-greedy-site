# PHASE D POST-CLOSURE VERIFICATION CHECKLIST

Date: 2026-10-06  
Status: ACTIVE AUDIT CHECKLIST  
Applies after: **PHASE D — PASS / CLOSED**

## Purpose

Use this checklist after any change that can affect the GENESIS Core → Platform Admin bridge, including:
- Core bridge views
- bridge wrapper functions
- bridge-role grants
- Platform Edge Functions
- Admin Bridge Health code
- Admin routing/auth
- Codex read projection
- World/Atlas detail paths
- deployment/runtime bindings

A change is not considered safe for promotion until this checklist passes.

## A. Change-control preflight

- [ ] Record commit / migration / deployment identifier.
- [ ] Record exact changed files, functions, views, grants, or policies.
- [ ] Confirm change scope does **not** authorize production/story mutation.
- [ ] Confirm Codex `mutation_cutover` remains `HOLD`.
- [ ] Confirm release/production gates remain independently controlled.
- [ ] Confirm no live Core data reset, deletion, repurposing, or destructive testing is planned.

## B. Core role and privilege verification

Verify both `genesis_bridge_login` and `genesis_bridge_reader`:

- [ ] `genesis_bridge_login` may LOGIN.
- [ ] `genesis_bridge_reader` cannot LOGIN directly.
- [ ] `genesis_bridge_login` inherits only the intended bridge reader role.
- [ ] SUPERUSER = false.
- [ ] CREATEROLE = false.
- [ ] CREATEDB = false.
- [ ] BYPASSRLS = false.
- [ ] No membership in `service_role`.
- [ ] No membership in `postgres`.
- [ ] `genesis_private` schema USAGE = false.
- [ ] `genesis_private` schema CREATE = false.
- [ ] Direct private SELECT = 0.
- [ ] Direct private INSERT = 0.
- [ ] Direct private UPDATE = 0.
- [ ] Direct private DELETE = 0.
- [ ] Direct private TRUNCATE = 0.

Any failure in this section = **BLOCKED**.

## C. Curated bridge surface verification

Confirm bridge read access is limited to approved `genesis_bridge` surfaces.

Expected read surfaces:

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

- [ ] No unexpected additional Core relation is directly readable by the bridge login.
- [ ] No bridge relation grants write authority.
- [ ] Narrow bridge wrappers are used for protected detail access.
- [ ] Bridge login still cannot directly execute broad Admin RPCs used underneath the wrappers.

Expected narrow wrappers:
- `monster_detail_payload_v1(uuid)`
- `map_detail_payload_v1(uuid)`
- `item_detail_payload_v1(uuid)`
- `atlas_gate_payload_v1(uuid)`

## D. Platform security verification

- [ ] Platform Admin JWT required.
- [ ] Inactive/non-admin identities are rejected.
- [ ] No Core database credential appears in browser/client code.
- [ ] `GENESIS_CORE_DB_URL` remains server secret only.
- [ ] Platform SECURITY DEFINER RPCs retain locked `search_path`.
- [ ] Anonymous/PUBLIC execution is not reintroduced.
- [ ] Temporary diagnostics remain retired.
- [ ] Admin assets remain protected and no-store.

## E. Codex parity verification

Expected baseline at Phase-D closure:
- Core reveal rows: **41**
- Platform reveal rows: **41**
- Distinct Core IDs: **41**
- `CORE_BACKFILL`: **41/41**
- `read_cutover`: **SYNCED**
- `mutation_cutover`: **HOLD**

Checklist:
- [ ] Core and Platform counts match.
- [ ] No duplicate `core_reveal_id`.
- [ ] Required reveal fields remain populated.
- [ ] Read cutover remains synced.
- [ ] Mutation cutover remains hold unless separately authorized.

## F. World projection sanity verification

Phase-D closure baseline:
- World Summary rows: **43**
- World Index rows: **12,192**

- [ ] Summary view executes successfully.
- [ ] Index view executes successfully.
- [ ] World Detail executes for a sampled entity.
- [ ] Atlas Gate executes for the same or another sampled entity.
- [ ] No nested permission-denied errors appear in Core Postgres logs.
- [ ] Bridge role still has 0 direct private relation access.

## G. Full Bridge Health live gate

Run **PHASE-D-FULL-BRIDGE-V1** from the protected Admin runtime.

Required 12 diagnostics:

1. [ ] Auth boundary — unauthenticated request rejected.
2. [ ] Production Status.
3. [ ] Roadmap.
4. [ ] Continuity.
5. [ ] Authorities.
6. [ ] Manuscripts Index.
7. [ ] Manuscript Version.
8. [ ] World Summary.
9. [ ] World Database.
10. [ ] World Detail.
11. [ ] Atlas Gate.
12. [ ] Codex Read.

Required final state:
- [ ] **12 / 12 PASS**
- [ ] **0 FAIL**
- [ ] Core mode = READ ONLY
- [ ] Direct `genesis_private` access = DENIED
- [ ] Write bridge = NOT PERMITTED
- [ ] Platform Auth = REQUIRED
- [ ] Bridge Health = PASS

Any failed diagnostic = **BLOCKED**.

## H. Deployment/runtime verification

- [ ] Protected Admin deployment workflow succeeds.
- [ ] Required runtime bindings verified.
- [ ] Stable protected Admin hostname verified.
- [ ] Runtime fingerprint is visible/current.
- [ ] No stale hardcoded bridge status remains.
- [ ] Browser loads the intended Admin bundle.

Current Phase-D runtime fingerprint:
- **PHASE-D-FULL-BRIDGE-V1**

## I. Audit evidence to retain

For every post-closure verification retain:
- commit SHA(s)
- migration name(s)
- Worker version / deployment run
- Core privilege query result
- Platform function log timestamps
- Core Postgres error logs if any
- Bridge Health screenshot/result
- final PASS/BLOCKED decision

## Final decision rule

A post-closure verification is **PASS** only when:
- all Core privilege invariants hold;
- no direct private access is introduced;
- all 12 live Bridge Health diagnostics pass;
- deployment/runtime verification passes;
- held mutation/production gates remain unchanged unless separately authorized.

Otherwise the bridge is **BLOCKED** and must not be promoted.
