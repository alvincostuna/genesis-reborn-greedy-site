# GENESIS Protected World Detail Bridge Contracts

Date: 2026-10-04
Status: FROZEN CONTRACT DRAFT
Scope: Admin protected World detail + Atlas read migration
Safety: NON-DESTRUCTIVE / READ-ONLY

## Purpose

Migrate the remaining protected World detail reads away from the legacy quota-blocked Core Admin routes while keeping GENESIS CORE authoritative.

This contract covers:
- Monster protected detail
- Map protected detail
- Item protected detail
- Atlas gate read

This contract does NOT authorize:
- Core writes
- database proposal apply/update
- Codex reveal mutation
- roadmap mutation
- production mutation
- reader/public publication changes
- direct genesis_private access

---

# DTL-001 — Protected Entity Detail

## Platform Edge Function

Name:
- genesis-world-detail

Method:
- GET only

Authentication:
- GENESIS PLATFORM JWT required
- active public.admin_users row required

Allowed domains:
- monsters
- maps
- items

Required parameters:
- domain
- entity_id UUID

Rejected:
- every other domain
- malformed UUIDs
- missing parameters

Core source:
- curated genesis_bridge views only

Recommended bridge surfaces:
- genesis_bridge.monster_detail_v1
- genesis_bridge.map_detail_v1
- genesis_bridge.item_detail_v1

Do not expose genesis_private tables directly.

---

## Monster detail contract

Must preserve the useful information currently assembled by the legacy protected-detail function without exposing raw private-table privileges.

Required top-level structure:

{
  "entity": {
    "id": "...",
    "code": "...",
    "type": "monster",
    "canonical_name": "...",
    "public_name": "...",
    "status": "...",
    "first_public_part_id": "..."
  },
  "detail": {
    "master": {...},
    "taxonomy": {
      "race": {...},
      "property": {...},
      "rank": {...}
    },
    "runtime_profiles": {
      "derived": {...},
      "cognition": {...},
      "taming": {...},
      "spawn_rarity": {...},
      "identification": {...}
    },
    "skills": [...],
    "spawns": [...],
    "loot_table": {...},
    "loot": [...],
    "counts": {...}
  }
}

Existing Core sources currently used by legacy detail:
- genesis_private.monster_master
- monster_race_catalog
- monster_property_catalog
- monster_rank_profiles
- monster_runtime_derived_profiles_v1
- monster_cognition_profiles
- monster_taming_profiles
- monster_spawn_rarity_assignment
- monster_identification_visibility_v14_15
- entity_skill_assignments
- skill_master
- spawn_profiles
- map_zones
- loot_table_master
- loot_entries
- item_master
- public.game_entities

Bridge rule:
- the Platform login receives no SELECT on any of the above
- only the curated monster detail bridge surface is selectable

---

## Map detail contract

Required structure:

{
  "entity": {...},
  "detail": {
    "master": {...},
    "ecology": {...},
    "zones": [...],
    "landmarks": [...],
    "routes": [...],
    "spawns": [...],
    "npcs": [...],
    "shops": [...],
    "counts": {...}
  }
}

Existing Core sources currently used:
- genesis_private.map_master
- map_ecology_policy
- map_zones
- map_landmarks
- map_routes
- spawn_profiles
- monster_master
- npc_master
- shop_master
- public.game_entities

Bridge rule:
- no private-table grant
- one curated read-only detail surface

---

## Item detail contract

Required structure:

{
  "entity": {...},
  "detail": {
    "master": {...},
    "equipment": {
      "weapon": {...},
      "armor": {...},
      "accessory": {...},
      "use_profile": {...}
    },
    "lifecycle": {
      "identification": {...},
      "enhancement": {...},
      "sockets": {...}
    },
    "drop_sources": [...],
    "shops": [...],
    "vendor_overrides": [...],
    "world_distribution": [...],
    "world_presence": {...},
    "counts": {...}
  }
}

Existing Core sources currently used:
- genesis_private.item_master
- weapon_master
- armor_master
- accessory_master
- equipment_use_profiles
- item_identification_profiles
- item_enhancement_profiles
- item_socket_profiles
- loot_entries
- shop_inventory
- shop_master
- vendor_item_price_overrides
- equipment_map_distribution_v1
- equipment_world_presence_v1
- public.game_entities

Bridge rule:
- no private-table grant
- curated read-only projection only

---

# DTL-002 — Atlas Gate Read

## Platform Edge Function

Name:
- genesis-atlas-gate

Method:
- GET only

Authentication:
- GENESIS PLATFORM JWT required
- active admin required

Required parameter:
- entity_id UUID

Core source:
- curated bridge surface only

Recommended bridge surface:
- genesis_bridge.atlas_gate_v1

No Codex/reveal mutation is permitted by this contract.

## Required return structure

{
  "entity": {
    "id": "...",
    "code": "...",
    "type": "...",
    "canonical_name": "...",
    "public_name": "...",
    "entity_status": "..."
  },
  "current_gate": "HIDDEN|RUMORED|DISCOVERED|ENCOUNTERED|ANALYZED|MASTERED",
  "projection_gate": "...",
  "first_public_executed": false,
  "first_public": {...},
  "active_reveal_plan": {...},
  "latest_approved_reveal_plan": {...},
  "reader_fields": {
    "projection_safe_fields": [...],
    "executed_revealed_fields": [...],
    "hidden_fields": [...]
  },
  "projection": {
    "website_status": "...",
    "reveal_requirements": {...},
    "updated_at": "..."
  },
  "gates": [...],
  "safety": {...}
}

Current legacy read combines:
- public.game_entities
- public.story_parts
- public.entity_reveals
- genesis_private.monster_public_bestiary_projection_v1
- genesis_private.roadmap_public_reveal_plan
- genesis_private.roadmap_versions
- genesis_private.roadmap_parts

## Fail-closed Atlas law

The bridge must preserve:

- backend existence does NOT promote reveal state
- art approval does NOT promote reveal state
- private roadmap registration does NOT promote reveal state
- unpublished manuscript/story data does NOT promote reveal state
- hidden fields remain hidden even at MASTERED unless explicitly reader-safe
- public visibility remains derived only from approved/executed evidence

---

# DTL-003 — Platform response contracts

## genesis-world-detail

Success:

{
  "endpoint": "genesis-world-detail",
  "mode": "read_only",
  "domain": "monsters",
  "row_count": 1,
  "data": {...}
}

Errors:
- 401 missing_authorization / invalid_session
- 403 admin_required
- 404 entity_not_found
- 405 method_not_allowed
- 422 invalid_domain / invalid_entity_id
- 502 core_bridge_unavailable
- 503 bridge_disabled

## genesis-atlas-gate

Success:

{
  "endpoint": "genesis-atlas-gate",
  "mode": "read_only",
  "row_count": 1,
  "data": {...}
}

Same auth/error contract as above.

No raw SQL error text.
No DB URI.
No passwords.
No service role secret.
No manuscript body.

---

# DTL-004 — Security contract

Existing bridge roles remain:

- genesis_bridge_reader
- genesis_bridge_login

Required grants after Core surfaces are created:

- USAGE on genesis_bridge
- SELECT only on:
  - monster_detail_v1
  - map_detail_v1
  - item_detail_v1
  - atlas_gate_v1

Must remain FALSE:
- schema usage on genesis_private
- direct SELECT on source private tables
- INSERT
- UPDATE
- DELETE
- TRUNCATE
- BYPASSRLS
- SUPERUSER
- CREATEDB
- CREATEROLE
- REPLICATION

No SECURITY DEFINER routine is exposed to the bridge login as an escape hatch.

---

# DTL-005 — Frontend cutover contract

World Database list/summary:
- already migrated to Platform bridge

Protected detail:
- buttons may be enabled only after genesis-world-detail passes migration gates

Atlas:
- may be shown only after genesis-atlas-gate passes migration gates

Database proposals:
- remain isolated/disabled during this read-only migration

Codex:
- not migrated by this contract
- Codex projection/reveal management remains a separate Platform phase

Failure behavior:
- local detail/Atlas error only
- list/summary stays usable
- Platform-native Admin stays usable
- no fallback to legacy quota-blocked Core routes

---

# DTL-006 — Migration gates

## Data parity
- monster detail sample matches legacy protected-detail output
- map detail sample matches
- item detail sample matches
- Atlas gate sample matches current legacy read
- nested counts match
- IDs/codes/names match
- no extra private fields appear

## Auth/RBAC
- no token -> 401
- invalid token -> 401
- non-admin -> 403
- inactive admin -> 403
- active admin -> 200

## Read-only boundary
- private schema usage remains denied
- private table SELECT remains denied
- no write grants
- no mutation function execute grants

## UI parity
- record opens from World Database
- protected detail renders correctly
- Atlas gate renders correctly
- unavailable detail handled locally
- mobile/desktop layout remains usable

## Failure isolation
- bridge 502 affects detail only
- World list remains usable
- Admin shell remains usable
- no legacy API fallback

## Stop conditions
Stop immediately if:
- parity mismatch appears
- private access widens
- write privilege appears
- Atlas state differs from current canonical evidence
- hidden reader fields leak
- Core production/story records change unexpectedly
