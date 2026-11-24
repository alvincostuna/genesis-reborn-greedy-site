# GENESIS World & Codex — RED TEAM 2026-11-14

## Scope
Read-only CORE and PLATFORM verification plus a narrow Admin UI repair. No story release, Canon manuscript, production lock, private gameplay ledger, or public reveal is changed.

## Live evidence (2026-11-14)
- CORE world registry: 81 canonical maps, 47 route records, 8 zones, 9 landmarks, 2,565 game entities.
- CORE Atlas `public.api_atlas_map_index_v1(null,5)`: `FULL_FOG`, zero reader-safe maps.
- All 81 map entities currently have `status=hidden` and no `first_public_part_id`. All 25 `public.story_parts` are `stage2` / `hidden`, with no publish timestamp.
- CORE release state: `launch_authorized=false`, `releases_paused=true`, published Final Canon parts = 0.
- CORE `roadmap_public_reveal_plan` has 41 entries overall, but only one map `FIRST_PUBLIC` DRAFT for the active VFINAL roadmap: `MAP-000001`, E004-P01. Historical APPROVED plans must not be treated as public release approval.
- PLATFORM `codex_reveal_plans`: 41; `codex_projection_state`: 0; `admin_asset_manifest`: 0. These are distinct from the underlying CORE world registries.
- PLATFORM `genesis-world-database`, `genesis-world-detail`, `genesis-atlas-gate`, and `genesis-codex-read` Edge Functions are ACTIVE and require a JWT.
- The Admin World Database table was still rendering disabled “Detail migration pending” buttons, even though protected-detail and Atlas code paths exist and corresponding endpoints are deployed.

## Narrow repair on this branch
1. Re-enable Admin **Inspect** for Core World entities with canonical UUIDs and for read-only expanded design registry entries.
2. Route inspection through the existing `renderDatabaseStaging` method and protected JWT-backed Edge Functions. Do not enable update proposals.
3. Add a region-based directory to the Admin Maps table. This is a **registry navigation**, not an invented geographic illustration or a public map.
4. Make Codex Admin summary distinguish active-roadmap plans, historical approved plans, draft plans, and executed plans; display roadmap/version in reveal rows.
5. Keep the public Atlas/Codex fail-closed and preserve launch/reveal restrictions.

## Verification
- Parse check of updated `public/admin/admin.js`: PASS.
- Code readback: protected Inspect and region selector exist; previous disabled text removed.
- CORE Atlas RPC: empty/FOG by design with zero released Parts.
- CORE world bridge: 81 map records available to authenticated Admin.
- PLATFORM Edge Function presence and JWT verification: verified metadata.
- Authenticated browser click-path check and Cloudflare deployment: **NOT YET VERIFIED**.
- Public art/rendered map: **NOT PRODUCED**.

## Remaining launch blockers (not to bypass)
1. Canonical production parts need true Final Canon reader publication before FIRST_PUBLIC becomes executable. Do not retag Stage-2 as published.
2. Map reveal bindings and per-field disclosures need synchronization at the publication boundary; historical plans alone do not qualify.
3. The art manifest contains no approved map assets. Build real map artwork and route schematics from reviewed canonical geography, not inferred coordinates.
4. Platform reader projection must be backfilled only from genuinely published evidence. It currently has zero reader-safe records.
5. Before deploying: browser-test Admin login, World Maps region filtering, Inspect detail/Atlas gate, expanded registry read-only behavior, Codex active/historical status, and reader fog-of-war.
6. Audit legacy `api_entity_search` / `api_entity_by_slug` against `api_entity_search_v2` for backend/service-role visibility parity. The current anonymous role has no direct SELECT on `game_entities`, so a confirmed public data leak has not been established.

## Hold points
- No production deployment or unreviewed merge.
- No bulk migration from historical approved roadmap plans to live public status.
- No Core or Platform DB writes in this patch.
- No direct grants on `genesis_private`.
