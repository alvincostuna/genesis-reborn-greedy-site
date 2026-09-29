# GENESIS Website/Admin — Severity-Ranked Red-Team Remediation Plan

Version: RTR-V1  
Owner: Website/Admin Builder  
Operating rule: fix safety/authority problems before polish.

## Severity definitions

- **S0 — Stop-Ship:** security, privacy, destructive-data, unreleased-content, auth bypass, or irreversible deployment risk.
- **S1 — Production Blocker:** feature/architecture defect that makes the approved product misleading, unreliable, or unverifiable.
- **S2 — Major:** important completeness/usability gap; may follow S1 but must be closed for the approved finished-product target.
- **S3 — Polish:** quality/visual/content improvements that do not invalidate production safety.

## S0 — Stop-Ship controls

No confirmed S0 incident is currently established from the source audit. These remain permanent guardrails:

1. Public Worker must never receive Admin service-role / Access secrets.
2. Public `/admin/` must remain unavailable.
3. Protected Admin must keep Cloudflare Access + Supabase RBAC.
4. Website/Admin work must not resume AI-2, rewrite committed manuscript, or replace the active production run.
5. No candidate/noncanon/unreleased database content may become public through World/Codex/Bestiary.
6. Live promotion must retain a rollback path.

Any regression converts readiness to BLOCKED immediately.

## S1 — Production blockers

### S1-01 — Reconcile the Admin/public branch split

**Finding:** `feat/admin-manuscript-viewer` is 218 commits ahead of and 250 commits behind `main` at audit time.

**Risk:** blind merge can lose newer public-site/auth work or break protected Admin behavior.

**Action:**
- inventory Admin-only files/commits,
- classify each delta KEEP / PORT / OBSOLETE,
- create a reconciliation branch from current `main`,
- port Admin changes in controlled batches,
- run Admin + public regression after every batch,
- retire the divergent branch only after parity evidence.

**Done when:** one reviewed lineage can build the current public site and protected Admin implementation without regression.

### S1-02 — Make readiness CI apply to current release source

**Finding:** visual-QA branch triggers are mostly historical feature branches; current-head readiness evidence is incomplete.

**Action:**
- add production-readiness workflow on PRs to `main` and manual dispatch,
- run typecheck, browser-JS syntax, static blocker audit, desktop/mobile QA,
- retain artifacts,
- make readiness fail closed.

**Done when:** current release SHA has a green readiness run.

### S1-03 — Global Search is a dead production control

**Finding:** Search is displayed in the approved design but is currently disabled.

**Action:**
- implement public-safe search over released stories + allowed Codex/World records,
- enforce reveal/fog-of-war rules server-side,
- support keyboard/mobile interaction,
- add zero-state/error/loading handling,
- test no unreleased/candidate results can leak.

**Alternative:** remove Search from production until implemented.

**Done when:** visible Search is functional and safe, or absent.

### S1-04 — Notification bell is visually active but not a complete notification system

**Risk:** misleading/dead control and inconsistent reader state.

**Action:**
- define notification types (release, account, reward/quest, announcement where allowed),
- persist read/unread state,
- implement unread badge source,
- build inbox/dropdown/mobile view,
- provide empty/error states.

**Alternative:** hide bell until implemented.

### S1-05 — Release card must be backend-authoritative

**Finding:** normal schedule is calculated client-side even though Admin can schedule/delay/pause releases.

**Risk:** homepage can disagree with release queue.

**Action:**
- make release API/queue authoritative for Part, publish time, delayed/paused state,
- keep 8 AM / 2 PM / 8 PM Manila schedule only as fallback,
- add timezone and Sunday-rest regression,
- test Admin exception overrides default schedule.

### S1-06 — Currently Reading must use exact reader progress

**Finding:** homepage can derive featured/latest released content instead of exact reader continuation.

**Action:**
- persist exact Episode + Part + progress/position,
- load per-reader resume state,
- make Continue Reading deep-link to exact Part/position,
- anonymous users get an honest latest/start state rather than fake personalization.

### S1-07 — Verify deployed current head, not just source

**Finding:** current live output could not be independently rendered in the audit environment, and no workflow run was returned for the current main commit by the connector.

**Action:**
- run readiness workflow on current reconciliation/release candidate,
- deploy isolated Cloudflare candidate,
- capture route/security/UI evidence,
- only then promote live.

## S2 — Major completeness

### S2-01 — Latest Releases must be Part-level

Use real Episode/Part, title, publish time, NEW state, and release link. Do not synthesize generic episode cards when Part data exists.

### S2-02 — Announcements should be Admin-managed

Create public-safe announcement records with publish/unpublish windows. Avoid hard-coded homepage announcements for the finished target.

### S2-03 — Complete Your Access data

Bind Tier, EXP, next tier, advance access, support unlocks, active quests, collectible count and avatar to real account state with safe logged-out fallbacks.

### S2-04 — Preserve the avatar/profile treatment

Do not replace the circular profile presentation with plain `Account` / `Sign in` text after auth initialization. Keep the design language and change state inside it.

### S2-05 — World/Codex needs entity-specific visual/data quality

Current shared category artwork is useful scaffolding, not final Atlas/Bestiary quality.

Action:
- entity-specific artwork where available,
- public-safe stats/fields per reveal state,
- map/entity linking,
- discovered/unrevealed states,
- no candidate leakage.

### S2-06 — Fan Page upload truth

If reader uploads remain disabled, do not present upload UI as available. Implement moderation/upload path before enabling.

### S2-07 — Support/payment production truth

Clearly separate TEST / PRE-LAUNCH / LIVE support modes. No payment-looking CTA may claim live behavior until provider/webhook/reconciliation tests pass.

### S2-08 — Admin mobile/tablet operational QA

Critical Admin tasks must remain usable outside desktop:
- release control,
- reader moderation,
- manuscript inspection,
- RBAC/audit,
- guarded proposals.

## S3 — Polish

1. Improve final icon/hover/focus consistency.
2. Tune desktop information density against approved mockup.
3. Regenerate the approved reference mockup to show the actual 8 AM / 2 PM / 8 PM Mon–Sat release rule.
4. Improve loading skeletons and empty states.
5. Add accessibility pass for focus order, labels, contrast, reduced motion and keyboard use.
6. Replace generic placeholder entity art progressively as final assets are produced.

## Execution order

### Phase 0 — Freeze and inventory
- no live deployment,
- no blind Admin merge,
- record current main/Admin SHAs,
- inventory Admin-only delta.

### Phase 1 — Safety + CI
- create production-readiness gate,
- add current-main/release-candidate CI,
- verify public/Admin isolation,
- reconcile Admin lineage.

### Phase 2 — Homepage functional truth
- Search,
- Notifications,
- backend-authoritative Next Release,
- exact Currently Reading,
- Part-level Latest Releases.

### Phase 3 — Dynamic content completion
- Admin announcements,
- full Access card,
- profile/avatar,
- Fan/support production-state truth,
- World/Codex reveal-quality pass.

### Phase 4 — Admin parity
- port/synchronize protected Admin,
- RBAC/Access tests,
- mobile/tablet QA,
- guarded mutation regression.

### Phase 5 — Release candidate
- full desktop/mobile visual QA,
- auth/recovery smoke,
- security scan,
- isolated Cloudflare candidate,
- evidence packet review.

### Phase 6 — Live promotion
- Commander approval through existing `genesis-live` environment,
- promote verified version,
- live smoke,
- retain rollback identifier.

## Progress accounting rule

Overall completion percentage must be calculated only from closed, evidenced remediation items.

- Source exists: not complete.
- UI renders: not complete.
- Connected but untested: not complete.
- Tested locally: partial.
- Candidate verified: nearly complete.
- Live verified with rollback: complete.

## Immediate sprint

The first remediation sprint should close, in order:

1. S1-01 Admin branch reconciliation inventory.
2. S1-02 readiness workflow/current-head CI.
3. S1-05 backend-authoritative release state.
4. S1-06 exact reader resume.
5. S1-03 Search.
6. S1-04 Notifications.
7. S1-07 isolated candidate/live verification.

Do not spend the sprint on decorative polish before these are green.
