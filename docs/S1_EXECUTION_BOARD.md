# GENESIS Website/Admin — S1 Execution Board

Version: S1-BOARD-V1  
Owner: Website/Admin Builder  
Gate source: PR #14 / `website-redteam-readiness-v1`  
Latest measured readiness run: GitHub Actions run **36532576361**  
Result: **BLOCKED**  
Static audit: **6 PASS / 4 FAIL / 0 S0 FAIL / 4 S1 FAIL**  
Independent branch-integrity blocker: **main-only 250 / Admin-only 218**

## Board rule

An S1 item closes only when its completion evidence exists. Code presence is not enough.

Statuses:
- **IN_PROGRESS** — implementation/reconciliation actively underway.
- **OPEN** — actionable, not yet started.
- **VERIFY** — source-level work appears present, but runtime/candidate evidence is missing.
- **WAITING** — blocked by preceding S1 items.
- **DONE** — evidence attached and readiness gate updated.

## Execution board

| Order | S1 | GitHub issue | Status | Current evidence | Exit condition |
|---:|---|---|---|---|---|
| 1 | S1-01 Admin/public reconciliation | #15 | **IN_PROGRESS** | 250 main-only / 218 Admin-only commits; merge base `e201d7e...` | Controlled reconciliation branch has protected Admin parity without regressing current main |
| 2 | S1-02 Current-source readiness CI | #16 | **IN_PROGRESS** | New readiness workflow exists in PR #14; current gate still reports main visual-QA coverage failure | Current release SHA has green mandatory CI + retained QA artifacts |
| 3 | S1-05 Backend-authoritative release state | #19 | **OPEN** | `PRG-DATA-RELEASE-AUTHORITY = FAIL` | Admin/backend queue wins over client fallback for scheduled/delayed/paused exceptions |
| 4 | S1-06 Exact reader resume | #20 | **VERIFY** | Static gate reports `PRG-DATA-READER-RESUME = PASS` | Authenticated candidate proves exact Episode/Part/progress resume and safe fallbacks |
| 5 | S1-03 Safe global Search | #17 | **OPEN** | `PRG-FUNC-SEARCH = FAIL`; visible control is disabled | Public-safe Search works end-to-end or control is absent |
| 6 | S1-04 Notifications | #18 | **OPEN** | `PRG-FUNC-NOTIFICATIONS = FAIL` | Real unread/read data flow works or bell is absent |
| 7 | S1-07 Candidate/live verification | #21 | **WAITING** | Existing deployment safety workflow is strong, but current release evidence is incomplete | Isolated candidate passes; live promotion passes; rollback ID recorded |

## Critical path

```
S1-01 Branch reconciliation
       ↓
S1-02 Current-source CI
       ↓
S1-05 Release authority ──┐
S1-06 Reader resume ──────┼→ S1-07 Candidate/live verification
S1-03 Search ─────────────┤
S1-04 Notifications ──────┘
```

S1-03 and S1-04 may be executed in parallel after the reconciled source line is stable.

## Sprint 1 — lineage and gate

### S1-01
- [x] Record current main baseline: `60114bf4612c978c98ee3df245845a633600eb3e`
- [x] Record Admin head: `4bbf7c4dce74113aa85d97b6dbcc0d4181c3a3f4`
- [x] Record merge base: `e201d7ec8a141234813eb925e90296c6af0745e6`
- [x] Create clean reconciliation branch from main: `website-admin-reconcile-v1`
- [x] Inventory 43 changed files
- [ ] Port Admin-only runtime/UI capabilities in controlled batches
- [ ] Exclude stale/static manuscript copies from website runtime
- [ ] Repoint protected Admin deployment to reconciled branch
- [ ] Run Admin + public regression
- [ ] Confirm divergence blocker cleared

### S1-02
- [x] Define readiness gate
- [x] Add source audit script
- [x] Add blocking readiness workflow
- [x] Open draft PR #14
- [x] Run gate once; expected BLOCKED result obtained
- [ ] Add current `main` / release-candidate coverage to the full visual-QA workflow
- [ ] Attach desktop/mobile QA artifacts to current candidate
- [ ] Require readiness result for release decision

## Sprint 2 — authoritative homepage behavior

### S1-05
- [ ] Define public release-state contract
- [ ] Bind exact next Part/time/state
- [ ] Make server/Admin state override schedule fallback
- [ ] Test 08:00 / 14:00 / 20:00 Manila cadence
- [ ] Test Sunday rest
- [ ] Test Admin exception/delay/pause
- [ ] Verify no unreleased manuscript payload leaks

### S1-06
- [ ] Build deterministic reader fixture
- [ ] Persist exact Episode/Part/progress
- [ ] Verify home Currently Reading
- [ ] Verify Continue Reading target
- [ ] Verify invalid/stale target fallback
- [ ] Verify signed-out fallback

## Sprint 3 — dead-control removal

### S1-03
- [ ] Implement public-safe search index/API or remove control
- [ ] Filter to released/revealed content
- [ ] Add keyboard/mobile UX
- [ ] Test hidden/candidate leakage

### S1-04
- [ ] Define notification schema/types
- [ ] Implement per-reader unread/read state
- [ ] Implement desktop/mobile inbox
- [ ] Test hidden-content leakage
- [ ] Or hide the bell until the above is complete

## Sprint 4 — release evidence

### S1-07
- [ ] Pin release candidate SHA
- [ ] Green readiness CI
- [ ] Green visual QA
- [ ] Isolated Cloudflare candidate
- [ ] Route + header + Admin-404 smoke
- [ ] Account/recovery smoke
- [ ] Search/notification smoke
- [ ] Release-authority smoke
- [ ] Reader-resume smoke
- [ ] Record rollback deployment/version
- [ ] Promote only via `genesis-live`
- [ ] Verify stable live site

## Current decision

**RELEASE GATE = BLOCKED**

This is expected and correct. The gate is doing its job: it is preventing a visually mature site from being called production-ready while the source lineage and four functional S1 findings remain unresolved.
