# PHASE E GO / NO-GO MATRIX

Date: 2026-10-06  
Status: ACTIVE ENTRY DECISION MATRIX  
Predecessor: **PHASE D — PASS / CLOSED**

## Decision states

- **NO-GO** — mandatory condition fails. Phase E must not begin.
- **HOLD FOR APPROVAL** — technical prerequisites pass, but scope/authority/rollback/approval is incomplete.
- **GO — READ ONLY** — approved Phase-E scope cannot mutate Core or production state.
- **GO — PLATFORM WRITE** — explicit Platform-owned mutation authority approved; Core remains read-only.
- **GO — CORE WRITE** — exceptional state requiring explicit Core mutation authorization, dedicated acceptance gate, rollback, and production-safety review.

Default state:
**HOLD FOR APPROVAL**

## Mandatory matrix

| Control | GO requirement | NO-GO condition | Evidence |
|---|---|---|---|
| Phase-D closure | Closure record remains valid | Closure invalidated or superseded without re-verification | Phase-D closure record |
| Post-closure verification | Latest run PASS | Any required verification failed/incomplete | Verification runbook evidence |
| Bridge Health | 12/12 PASS | <12/12 | Bridge Health result |
| Core private isolation | 0 direct private access | Any direct `genesis_private` access | Core privilege query |
| Core write privileges | None unless explicitly authorized | Unexpected INSERT/UPDATE/DELETE/TRUNCATE | Core privilege query |
| Core elevated roles | All false | SUPERUSER/CREATEROLE/CREATEDB/BYPASSRLS true | Role audit |
| Admin auth | Required and enforced | Auth bypass/weakened | Platform test/logs |
| Core credentials | Server-side only | Browser/client exposure | Code/runtime review |
| Codex parity | Synced | Broken parity or duplicate IDs | Core/Platform parity check |
| Codex mutation | HOLD unless separately approved | Silent/implicit enablement | Platform setting |
| World/Atlas | Healthy | Any bridge error | Live diagnostic |
| Deployment identity | Exact commit/version known | Unknown/stale runtime | Workflow + fingerprint |
| Rollback | Known and actionable | Missing rollback | Work order |
| Phase-E scope | Written and bounded | Ambiguous/open-ended scope | Work order |
| Mutation class | Explicitly classified | Not classified | Work order |
| Approval | Explicit for requested authority | Missing/implicit approval | Approval record |

Any NO-GO row overrides all GO rows.

## Scope classification matrix

| Phase-E work type | Default decision | Required authority | Must rerun Phase-D gate? |
|---|---|---|---|
| Documentation/audit only | GO — READ ONLY | Scope approval | No, unless runtime/security changed |
| Platform-native read UI | GO — READ ONLY | Scope approval | Yes if bridge/runtime path changes |
| Legacy route dependency audit | GO — READ ONLY | Scope approval | No unless code deployed |
| Legacy route retirement | HOLD FOR APPROVAL | Deployment approval + rollback | Yes |
| New curated Core read projection | HOLD FOR APPROVAL | Read-surface design approval | Yes |
| Platform RBAC/readers/community/messages/support write flow | HOLD FOR APPROVAL | Platform mutation approval | Yes if Admin runtime/auth changes |
| Release control-plane mutation | HOLD FOR APPROVAL | Explicit release mutation approval | Dedicated release acceptance gate |
| Codex mutation cutover | HOLD FOR APPROVAL | Explicit Codex mutation authority | Dedicated Codex mutation gate + Phase-D rerun |
| Manuscript mutation | NO-GO by default | Explicit dedicated authorization | Dedicated manuscript safety gate |
| Core canonical data write | NO-GO by default | Explicit Core write authorization | Dedicated Core mutation + rollback gate |
| Production/story mutation | NO-GO by default | Explicit production authorization | Production gate required |

## GO — READ ONLY conditions

All must be true:
- Phase D still PASS/CLOSED.
- Latest post-closure verification PASS.
- no bridge authority expansion.
- no Platform mutation beyond existing behavior.
- no Core mutation.
- no production/release/Codex mutation gate change.
- scope and rollback documented.

## GO — PLATFORM WRITE conditions

All GO — READ ONLY conditions plus:
- Platform-owned tables/functions are explicitly named.
- RBAC permission is deny-by-default.
- mutation is audit logged.
- rollback is defined.
- Core remains read-only.
- no implicit production/release authorization.
- dedicated acceptance checks are written.

## GO — CORE WRITE conditions

This state is exceptional.

All must be explicitly approved:
- exact Core objects to mutate;
- why Platform-only mutation is insufficient;
- production impact analysis;
- backup/rollback;
- dry-run or isolated proof where possible;
- audit logging;
- acceptance gate;
- post-mutation Phase-D rerun;
- production/story authorization if applicable.

Without all of these:
**NO-GO**.

## Automatic NO-GO triggers

Any one of these is sufficient:
- Bridge Health <12/12.
- direct `genesis_private` access for bridge roles.
- unexpected Core write privilege.
- auth bypass.
- secret exposure.
- World/Atlas failure.
- Codex parity failure.
- Codex mutation silently enabled.
- current deployment unknown.
- rollback unknown.
- scope ambiguous.
- production/story write requested without explicit authority.
- destructive testing proposed against live Core data.

## Approval record template

Before issuing GO, record:

- Phase-E title:
- category:
- objective:
- mutation class:
- in-scope objects:
- out-of-scope objects:
- source branch/commit:
- Core project:
- Platform project:
- Phase-D verification reference:
- rollback:
- required approver(s):
- approval evidence:
- acceptance gate:
- post-change Phase-D rerun required: YES/NO
- final decision:

## Final decision rule

1. Evaluate every mandatory matrix row.
2. If any NO-GO condition is true → **NO-GO**.
3. If no NO-GO exists but approval/scope/rollback is incomplete → **HOLD FOR APPROVAL**.
4. If all prerequisites pass → issue only the minimum required GO class:
   - GO — READ ONLY
   - GO — PLATFORM WRITE
   - GO — CORE WRITE

Never grant a broader GO class than the proposed work requires.

## Current state

Based on the Phase-D closure record:

- Phase D: **PASS / CLOSED**
- Bridge Health: **12/12 PASS**
- Core bridge: **READ ONLY**
- Codex mutation: **HOLD**
- Production/release authority: separately gated
- Phase E: **HOLD FOR APPROVAL**

No Phase-E mutation authority is implied by Phase-D closure.
