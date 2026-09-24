# GENESIS Admin — Control Center Blueprint

**Status:** PREPARED / READ-ONLY EXPANSION FIRST  
**Security:** Cloudflare Access + server-side Supabase elevated credential  
**Database:** existing GENESIS Supabase project only

## Top-level navigation

`Overview | Production | Manuscripts | Releases | Roadmap | Game Database | Continuity | Authority`

## Overview

Cards:
- Releases: PAUSED / ACTIVE
- Next scheduled Part
- Launch batch readiness
- Production router state
- Roadmap V1 status
- Roadmap V2 status
- Database completeness
- Blocking defects

## Production

Show:
- active production lock;
- batch;
- active role/engine;
- AI2/AI1 gates;
- verified counts;
- closeout status;
- defects;
- latest Builder handoff summary.

Stale E006–E010 router must be visibly flagged as historical/stale until an explicit post-audit production reset/cutover. Readiness PASS does not execute 202 or change the active 014 route.

## Manuscripts

Keep current features:
- Stage 1
- Stage 2
- Final Canon
- version metadata
- compare
- private reader preview

Add:
- Episode/Part grouping;
- final-canon readiness;
- release eligibility;
- roadmap version reference.

## Releases

Prepare:
- Episodes 1–10 launch-batch view;
- queued Part stream;
- next publish time;
- 8-hour cadence;
- pause/resume controls later;
- schedule audit;
- release history.

Mutation controls remain disabled until explicitly enabled and tested.

## Roadmap

Show both:
- V1 — ACTIVE / historical production authority
- V2 — DRAFT / synchronization workspace

V2 must never be activated by opening Admin or editing website code.

## Game Database

Read-only phase first.

Modules:
- Monsters
- Loot
- Items / Materials
- Weapons / Armor / Accessories / Gems
- Classes
- Professions
- Skills / Trees / Rank values
- Maps / Zones / Routes / Landmarks
- NPCs / Shops
- Quests
- Crafting / Repair / Salvage
- Pets / Taming / Mounts
- Party / Combat
- Economy
- Achievements
- Temporal Legacy

Each detail page should show:
- canonical ID/code;
- status/completeness;
- prerequisites;
- related entities;
- roadmap/reveal bindings where applicable.

## Continuity

Show:
- Part mechanical manifests;
- unresolved database dependencies;
- Codex reveal gates;
- future-use bindings;
- progression gate status;
- stale or contradictory records.

## Authority

Read-only authority browser:
- 000
- 017
- 025
- 029
- 031
- 032
- 033
- 034
- 035
- 036
- production-law references 202/203/103

Show active version and hash.

## Admin visual identity

- compact diamond sigil;
- compact GENESIS wordmark;
- dark professional UI;
- no oversized public hero on working screens;
- approved hero may be used on Admin entry/login or Overview banner only.

## Security rule

Browser never receives Supabase secret/service credentials.
Admin Worker mediates access through narrow server-side endpoints/RPCs.
