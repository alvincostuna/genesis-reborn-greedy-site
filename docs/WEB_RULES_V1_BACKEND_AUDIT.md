# WEB-RULES-V1 Backend & Publication Contract Audit

Status: BLOCKED FOR LIVE MERGE — ALIGNMENT REQUIRED  
Audit date: 2026-09-27  
Branch: `website-redesign-v1`  
Live production authority: Supabase  
Production run must remain untouched.

## Live state observed

- AI-2 is actively running 203 production.
- Public release system is paused.
- Public launch is not authorized.
- Public `story_parts` contains only hidden Stage 2 rows at audit time; no scheduled/published public rows.
- Existing private release items are HIDDEN and point to Final Canon versions.
- Payments/share rewards are disabled.

This is a safe state for an isolated website redesign, but the current public backend contract does **not** yet match WEB-RULES-V1.

## Release scheduling audit

### R1 — BLOCKER: schedule is still the old 8-hour cycle

Live `public.release_settings`:

- timezone: Asia/Manila
- cycle_anchor_local: 06:00
- cycle_hours: 8

This produces 06:00 / 14:00 / 22:00, while WEB-RULES-V1 requires:

- 08:00 PHT
- 20:00 PHT
- 2 Parts/day

Required alignment: use an 08:00 local anchor with a 12-hour cycle, or replace the cycle abstraction with explicit daily slots.

### R2 — BLOCKER: release clock reads the wrong queue

`api_release_clock()` finds `next_publish_at` from `public.story_parts`.

However, the publication bridge creates/updates `public.story_parts` during `publish_release_item()`, not when the private release item is merely scheduled.

Result: the website may show no next scheduled Part even when a private release item has a valid future schedule.

Required alignment: expose the next scheduled timestamp from the authoritative private release queue through a tightly scoped public SECURITY DEFINER API.

### R3 — BLOCKER: due-release processor can catch up multiple overdue Parts

`genesis_private.process_due_releases(p_limit,...)` loops over multiple due items and continues after a failed item.

WEB-RULES-V1 prohibits catch-up dumping and requires chronology preservation.

Required alignment:

1. validate the earliest due release only;
2. assert canonical order inside the publishing path itself;
3. if the earliest item cannot publish, later items must remain held;
4. one scheduler invocation must not dump a backlog of Parts.

### R4 — BLOCKER: publish_release_item does not itself assert canonical order

Public admin wrappers perform release-order checks, but `process_due_releases()` calls `publish_release_item()` directly.

The deepest publication gate therefore needs the order assertion, not only the caller.

### R5 — GAP: delayed-release law is not encoded in backend state

The website now displays DELAYED / BLOCKED / AWAITING states, but the backend has no explicit delayed release policy that applies the agreed behavior:

- a late canonical Part may publish when verified;
- later Parts cannot pass it;
- if the late publication lands too close to the next standard slot, the next Part waits for the following 08:00/20:00 slot;
- no automatic catch-up dump.

This needs a durable scheduling rule before launch.

## Publication-data contract audit

### P1 — BLOCKER: episode library can leak overdue scheduled metadata

`api_episode_library()` currently accepts both `scheduled` and `published` rows when `publish_at <= now()`.

A scheduled-but-not-actually-published Part can therefore contribute to released-Part counts/title metadata.

Required alignment: public episode library must count only `publication_status='published'` rows whose publication time has arrived.

### P2 — BLOCKER: pausing releases hides already-public library content

`api_episode_library()` requires `release_settings.releases_paused=false`.

Pause should stop *new* publication; it must not make already-published Parts disappear.

Required alignment: remove the pause condition from historical public visibility.

### P3 — PASS: reader Part body access is gated

`api_episode_parts_for_reader()` calls `reader_can_access_part()`, so unreleased body text is not returned merely by knowing an Episode number.

Comments and spoiler-gated fan feed also reuse the same access function.

### P4 — BLOCKER: support catalog is still the old model

Live rules currently expose:

- SUPPORT_10
- SUPPORT_50
- VIP_200
- VERIFIED_SHARE

with old 21/90-Part horizons.

WEB-RULES-V1 requires:

- SUPPORT_9 = ₱9, +100 EXP, +2 Parts
- SUPPORT_49 = ₱49, +500 EXP, +14 Parts
- SUPPORT_189 = ₱189, +2,000 EXP, +60 Parts
- VERIFIED_SHARE = +200 EXP, +1 Part, max 1/day and 5/week

Payment provider test configuration still allows `SUPPORT_10`.

### P5 — BLOCKER: old VIP model conflicts with permanent fixed-Part unlocks

`reader_can_access_part()` contains special `VIP_200` time-based access through +90 scheduled Parts.

WEB-RULES-V1 says advance access is fixed-Part entitlement:

- unlocked Parts remain readable;
- support/share entitlements stack;
- no story access depends on an expiring VIP horizon.

Required alignment: remove story-access behavior tied to `VIP_200`; use explicit permanent `advance_part_access` grants.

### P6 — BLOCKER: credit unlock is hard-limited to +21 Parts

`reader_unlock_next_advance_part()` only searches through `public_ordinal + 21`.

That prevents a +60-Part entitlement from functioning correctly.

Required alignment: entitlement allocation must be based on the reader's available credits and verified scheduled queue, not a hard-coded +21 cap.

### P7 — BLOCKER: Reader EXP / Tier / collectible backend does not exist yet

The public schema has reader profile/progress and support ledgers, but no authoritative:

- reader EXP ledger;
- Tier calculation contract;
- Tier-up reward entitlement;
- collectible catalog;
- random draw ledger;
- reader collectible ownership/duplicate quantity;
- public portfolio showcase;
- Reader EXP transaction idempotency.

The redesigned UI intentionally falls back to zero/default values, so it renders safely but is not yet functionally backed.

### P8 — GAP: reading progress exists but +100 EXP completion award does not

`public.reader_progress` can store completion state, but no authoritative completion-to-EXP settlement contract was found.

Required alignment: completion must be idempotent and award +100 EXP only once per eligible Part.

### P9 — GAP: frontend profile contract is ahead of api_reader_account

The redesigned Profile expects/falls back for:

- total EXP
- Tier
- latest-read label
- Parts read
- Episodes complete
- collection count
- reader title

`api_reader_account()` currently returns only display name, highest Episode/Part, spoiler mode, badge preferences and support status.

A new versioned reader-account contract is required.

## Existing protections that should be preserved

- Final Canon pointer checks before publication.
- Active-roadmap validation.
- Explicit launch authorization.
- Releases paused by default.
- Admin audit trail.
- Append-only advance credit ledger.
- Public reader body access through `reader_can_access_part()`.
- Spoiler gating for comments/fan feed.
- Payment/share features disabled until explicitly enabled.

## Required alignment order

1. Release schedule + clock contract.
2. Chronology/deferred release enforcement.
3. Public episode library visibility fix.
4. Support rule migration to 9/49/189 + 2/14/60.
5. Remove VIP story-access semantics and remove 21/90 hard-coded horizons.
6. Add Reader EXP/Tier ledger.
7. Add collectible reward catalog/draw/ownership.
8. Version `api_reader_account` for progression fields.
9. Add contract tests.
10. Re-run desktop/mobile rendered QA against an isolated backend test state.
11. Only then consider merge/live deployment.

## Deployment guard

Do not merge/deploy the redesign while any BLOCKER above remains unresolved.
Do not alter AI-2 production state, production locks, manuscripts, Final Canon pointers, or active run routing as part of website alignment.
