# Release Preparation Flow

**Launch model:** Episodes 1–10 together  
**Ongoing cadence:** 1 Part every 8 hours  
**Timezone:** Asia/Manila  
**Current release state:** PAUSED

## A. Pre-launch gates

No release item may become public unless:
1. the Part has Final Canon;
2. final-canon hash/version is fixed for that release item;
3. publication gate passes;
4. no release-blocking defect exists;
5. the target belongs to the approved post-cutover production line;
6. Commander has authorized launch.

Historical/reference manuscripts are never silently published.

## B. Special launch batch

Episodes 1–10 are a one-time launch package.

Launch preparation should:
- gather every Final Canon Part belonging to E001–E010;
- verify no missing Parts;
- verify episode/Part ordering;
- verify release-safe public titles;
- stage them as one launch batch;
- keep them hidden while releases are PAUSED;
- publish together only on explicit launch command.

The launch batch does **not** consume the 8-hour cadence slots.

## C. Ongoing scheduled stream

After the launch batch:
- first scheduled item = first eligible Part after E010;
- then each next Part = previous scheduled time + 8 hours;
- ordering follows canonical production/release order;
- no skipped Part unless explicitly withdrawn/held with audit reason.

At 8 hours per Part:
- 3 Parts per real day.

## D. Clock behavior

Source of truth:
`public.release_settings`

Required:
- timezone = Asia/Manila
- cycle_hours = 8
- releases_paused = true until launch approval

The launch timestamp is intentionally not set yet.

## E. Pause semantics

When PAUSED:
- no scheduled item becomes reader-visible;
- countdown may show “Release schedule paused”;
- Admin can inspect queue safely.

When ACTIVE:
- only eligible due items become public.

## F. Buffer protection

Existing buffer thresholds remain safety inputs.
Admin should show:
- production buffer;
- warning threshold;
- critical threshold.

A future release controller may automatically pause or require confirmation when buffer protection rules are breached, but this must be separately authorized.

## G. Audit

Every scheduling/publish/withdraw/pause/resume action must be auditable:
- actor
- timestamp
- old state
- new state
- old publish time
- new publish time
- reason

## H. Current preparation state

Prepared now:
- cadence definition
- launch-batch definition
- PAUSED requirement
- Admin UI requirements

Not done until later:
- actual launch date/time
- actual E001–E010 fresh Final Canon release items
- automatic unpause
- public publishing
\n\n## I. Roadmap / production alignment\n\nCurrent audited planning target: **Roadmap V3 (DRAFT)**. Roadmap V1 remains ACTIVE until an explicit cutover; V2 is preserved as the prior draft.\n\nReadiness checks against V3 are validation only. They do not activate V3, reset the 014 router, run 202/203/103/102, authorize launch, schedule a Part, or unpause releases.\n\nProduction-to-public chain:\n`V3 planned Part → explicit roadmap cutover when authorized → 202 → 203 → 103 → 102 when due → FINAL_CANON → release eligibility → queue/schedule → publication`.\n\nThe website may display V3 readiness and planned gates to Admin, but reader-facing content remains governed only by released Final Canon and approved public-reveal projections.\n