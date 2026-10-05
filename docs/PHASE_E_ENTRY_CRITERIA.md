# PHASE E ENTRY CRITERIA

Date: 2026-10-06  
Status: DRAFT ENTRY GATE  
Predecessor: **PHASE D — PASS / CLOSED**

## Purpose

Phase E may begin only after Phase D remains intact and the next work package is explicitly defined.

Phase-D closure alone does **not** authorize production resumption, story mutation, release launch, Codex mutation cutover, or broad Core write access.

## Mandatory entry conditions

### 1. Phase-D closure remains valid

- [ ] `docs/PHASE_D_BRIDGE_CLOSURE_20261006.md` remains the active closure record.
- [ ] Most recent post-closure verification passes.
- [ ] Full **PHASE-D-FULL-BRIDGE-V1** gate = 12/12 PASS.
- [ ] No unresolved bridge/security regression exists.
- [ ] No unexpected new bridge relation, wrapper, grant, or Admin path exists.

### 2. Security boundary remains unchanged

- [ ] Core remains canonical for production/story data.
- [ ] Platform remains the Admin/control plane.
- [ ] Bridge path remains read-only.
- [ ] `genesis_bridge_login` has no direct `genesis_private` access.
- [ ] No Core INSERT/UPDATE/DELETE/TRUNCATE privilege is granted to bridge roles.
- [ ] No broad Admin RPC EXECUTE grant is introduced where a narrow wrapper is sufficient.
- [ ] Core credentials remain server-side secrets.
- [ ] Platform Admin authentication remains mandatory.

### 3. Mutation gates remain held unless separately authorized

Before Phase E begins, explicitly record the state of:

- [ ] Codex `mutation_cutover` — expected **HOLD**.
- [ ] release launch authorization — expected independently controlled.
- [ ] production/story mutation gate — expected independently controlled.
- [ ] roadmap activation/mutation gate — independently controlled.
- [ ] manuscript write authority — not implied by bridge closure.

If Phase E intends to change any of these, that change requires its own approval/gate and must not be bundled silently into Phase E entry.

### 4. Phase-E scope is written before execution

A Phase-E work order must define:

- [ ] objective
- [ ] systems/tables/functions/files in scope
- [ ] systems/tables/functions/files explicitly out of scope
- [ ] whether work is read-only, Platform mutation, or Core mutation
- [ ] required approvals
- [ ] rollback point
- [ ] acceptance criteria
- [ ] failure conditions
- [ ] evidence to retain
- [ ] whether Phase-D bridge re-verification is required afterward

No undefined or exploratory Core mutation is allowed under a generic “Phase E” label.

## Recommended Phase-E categories

Phase E should be treated as a **new authorization boundary**, not an automatic continuation of Phase D.

Acceptable categories include:

### A. Platform-native Admin continuation
Examples:
- Platform-owned release workflow
- Website operations
- RBAC/admin controls
- Readers/community/messages/support
- Art workflow metadata

Entry requirement:
- no expansion of Core bridge authority.

### B. Legacy route retirement
Examples:
- deprecate remaining legacy `/admin/api/` routes
- remove rollback-only handlers after dependency proof

Entry requirement:
- prove zero active frontend/runtime dependency first.
- preserve rollback documentation until retirement is complete.

### C. Additional read-only Core projections
Examples:
- new curated Admin read view

Entry requirement:
- narrow surface definition
- SELECT-only bridge
- no direct private grants
- rerun full Phase-D gate after implementation.

### D. Mutation/control-plane cutover
Examples:
- Codex mutation ownership
- release mutation ownership
- other Platform write workflows

Entry requirement:
- separate design review
- explicit mutation authority
- audit logging
- rollback plan
- deny-by-default RBAC
- no implicit Core write bridge
- dedicated acceptance gate beyond Phase-D.

## Entry blockers

Phase E must **not** begin if any of the following is true:

- Bridge Health < 12/12.
- Any Core bridge role gains direct `genesis_private` access.
- Any unexpected Core write privilege appears.
- Platform Admin auth is bypassed or weakened.
- Core secret exposure is suspected.
- Codex parity is broken.
- World/Atlas bridge returns errors.
- current deployment cannot be identified.
- rollback point is unknown.
- requested Phase-E scope is ambiguous.
- production/story mutation would occur without explicit authorization.

## Phase-E kickoff record

Before beginning execution, record:

- Phase-E title:
- owner:
- date/time:
- source branch / commit:
- Core project:
- Platform project:
- Phase-D verification reference:
- mutation level: READ ONLY / PLATFORM WRITE / CORE WRITE
- approvals:
- rollback identifier:
- acceptance gate:
- expected completion state:

## Entry decision

Phase E entry status must be one of:

- **BLOCKED** — one or more mandatory conditions fail.
- **READY_FOR_SCOPE_APPROVAL** — Phase D is intact, but Phase-E scope/authority is not yet approved.
- **AUTHORIZED_TO_BEGIN** — scope, authority, rollback, and acceptance criteria are explicitly approved.

At the time of this document's creation:

**Phase-D is PASS/CLOSED.  
Phase-E is not automatically authorized.  
Default Phase-E state: READY_FOR_SCOPE_APPROVAL.**
