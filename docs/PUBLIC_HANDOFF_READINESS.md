# GENESIS Public Website Handoff Readiness

Version: PUBLIC-HANDOFF-V1  
Owner: Website/Admin Builder

## Goal

The official website must be able to remain online while production is still in progress, and it must begin showing story content automatically once the release pipeline lawfully publishes Final Canon.

No public-site deployment should be required merely because a new story Part becomes available.

## Data path

```
production FINAL_CANON
  → hidden release item
  → Admin readiness/schedule
  → publish_release_item()
  → public.story_parts
  → api_episode_library / api_episode_parts_for_reader
  → official Read page
```

The public Read page already reads released story data through the public APIs. It does not need static story files.

## Release-state authority

The public homepage/read status now targets:

`public.api_public_release_state_v1()`

This contract exposes only public-safe operational metadata:
- launch authorized / not authorized,
- releases paused / active,
- 08:00 / 14:00 / 20:00 PHT cadence,
- Monday–Saturday release days,
- Sunday rest,
- next scheduled publish time,
- next scheduled Part identity only when launch is authorized and releases are active,
- released Part count.

It never exposes manuscript body, hidden Final Canon text, private IDs, content hashes, or candidate story data.

## Authority rule

When a valid scheduled release exists, the backend timestamp is authoritative.

The browser's Manila 08:00 / 14:00 / 20:00 calculation is fallback only and is used only when:
- public launch is authorized,
- releases are not paused,
- no explicit scheduled Part currently exists.

Therefore an Admin delay, exact schedule, or pause cannot be overwritten by the client's normal cadence.

## Pre-launch behavior

While production is ongoing and launch is unauthorized/paused:
- public site may remain deployed and usable;
- release state honestly shows PRE-LAUNCH / PAUSED;
- countdown is not allowed to imply a guaranteed release;
- Read library remains empty if nothing is published;
- Stage 1, Stage 2, Final Canon hidden queue, and candidate data remain private.

## Story availability behavior

When a Part is eventually published:
- `api_episode_library` discovers the released Episode automatically;
- `api_episode_parts_for_reader` serves the accessible Part;
- no new website code deploy is required;
- reader progress/account systems continue against the published Part ID.

## Separation rule

This public branch does not modify:
- Admin Worker,
- public Worker routing/security,
- production routing,
- Final Canon content,
- release queue rows,
- deployment policy.

It changes only how the browser interprets the public-safe release-state contract.

