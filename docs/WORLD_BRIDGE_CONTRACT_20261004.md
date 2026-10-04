# GENESIS World Database Bridge Contract

Date: 2026-10-04
Status: CORE SURFACES CREATED / READ-ONLY
Scope: Admin World Database migration
Safety: NON-DESTRUCTIVE

## Architecture

GENESIS CORE remains authoritative.

GENESIS PLATFORM may read only curated views in schema:
- genesis_bridge

Restricted roles:
- genesis_bridge_reader: NOLOGIN, SELECT only on approved bridge views
- genesis_bridge_login: LOGIN, inherits genesis_bridge_reader

Forbidden:
- direct schema usage on genesis_private
- direct SELECT on genesis_private tables/views
- INSERT / UPDATE / DELETE / TRUNCATE
- mutation routine execution
- elevated role flags

## World bridge surfaces

### genesis_bridge.world_database_index_v1

Purpose:
- unified Admin-readable index for all existing World Database domains
- preserves the legacy Admin list shape
- no direct private-table exposure

Columns:
- domain text
- record_id text
- code text
- name text
- status text
- meta jsonb
- layer text
- read_only boolean

Layers:
- CORE_DATABASE
- EXPANDED_DESIGN_REGISTRY

Search/filtering will be performed by GENESIS PLATFORM Edge Functions with validated and parameterized inputs.

### genesis_bridge.world_database_summary_v1

Purpose:
- domain counts
- reader-safe/public projection counts
- replaces the legacy World Database summary read

Columns:
- summary_kind
- key
- layer
- row_count
- registered
- reader_safe_now

## Exact domain -> source mapping

### CORE_DATABASE

| Domain | Source |
|---|---|
| monsters | genesis_private.monster_master + public.game_entities |
| classes | genesis_private.class_master + public.game_entities |
| professions | genesis_private.profession_master + public.game_entities |
| skills | genesis_private.skill_master + public.game_entities |
| loot | genesis_private.loot_table_master + public.game_entities + loot_entries count |
| maps | genesis_private.map_master + public.game_entities |
| items | genesis_private.item_master + public.game_entities |
| npcs | genesis_private.npc_master + public.game_entities |
| quests | genesis_private.quest_master + public.game_entities |
| crafting | genesis_private.creation_recipe_master |
| companions | genesis_private.companion_species_profiles + public.game_entities + genesis_private.mount_profiles |

### EXPANDED_DESIGN_REGISTRY

The bridge intentionally reuses the existing canonical Admin projection:
- genesis_private.admin_game_database_expanded_index_v2

That projection maps:

| Domain | Underlying source |
|---|---|
| monster_catalog | monster_public_bestiary_projection_v1 |
| equipment_catalog | equipment_simulator_readiness_v3 + world_expansion_equipment_candidates_v1 name lookup |
| shops | shop_master + public.game_entities |
| routes | map_routes + public.game_entities |
| civilizations | civilization_profiles_v1 |
| races | dwarf_race_structure_v1, elf_race_structure_v1, orc_race_structure_v1, demon_race_structure_v1, undead_taxonomy_v1 |
| settlements | dwarf_settlement_design_v1, elf_settlement_design_v1, orc_settlement_design_v1, undead_settlement_design_v1, outlaw_settlement_design_v1 |
| transport_modes | transport_mode_archetype_v1 |
| transport_vehicles | transport_vehicle_archetype_v1 |
| transport_nodes | transport_node_plan_v1 |
| freight_corridors | freight_corridor_materialization_spec_v1 |
| competitions | competition_venue_design_v1 |
| currencies | currency_catalog |
| economy_levels | economy_level_curve_v1 |
| guild_skills | guild_skill_master |
| guild_facilities | guild_facility_archetype_v1 |
| sea_corridors | sea_corridor_contract_v1 |
| maritime_rates | maritime_service_rate_v1 |

## Current count parity

### Core domains
- classes: 73
- companions: 21
- crafting: 18
- items: 269
- loot: 174
- maps: 81
- monsters: 173
- npcs: 122
- professions: 102
- quests: 47
- skills: 589

All 11 core-domain counts match the legacy genesis_admin_game_database_list totals.

### Expanded domains
- civilizations: 5
- competitions: 11
- currencies: 9
- economy_levels: 500
- equipment_catalog: 6000
- freight_corridors: 79
- guild_facilities: 21
- guild_skills: 29
- maritime_rates: 23
- monster_catalog: 2968
- races: 44
- routes: 47
- sea_corridors: 1
- settlements: 38
- shops: 410
- transport_modes: 20
- transport_nodes: 297
- transport_vehicles: 21

All 18 expanded-domain counts match admin_game_database_expanded_index_v2.

## Security verification

Verified:
- genesis_bridge_reader USAGE on genesis_bridge: TRUE
- genesis_bridge_reader SELECT world_database_index_v1: TRUE
- genesis_bridge_reader SELECT world_database_summary_v1: TRUE
- genesis_bridge_login inherits genesis_bridge_reader: TRUE
- genesis_bridge_login USAGE on genesis_private: FALSE
- genesis_bridge_login SELECT monster_master: FALSE
- genesis_bridge_login SELECT admin_game_database_expanded_index_v2: FALSE

## Platform endpoint contract

Planned endpoint:
- genesis-world-database

Method:
- GET only

Required Platform Auth:
- valid JWT
- active public.admin_users record

Parameters:
- domain required; must be explicit allowlist
- q optional, max 200 chars
- limit default 100, max 200
- offset default 0

Response:
{
  "endpoint": "genesis-world-database",
  "mode": "read_only",
  "domain": "...",
  "layer": "...",
  "row_count": 0,
  "total": 0,
  "limit": 100,
  "offset": 0,
  "data": []
}

Planned summary endpoint:
- genesis-world-summary

Method:
- GET only

No browser receives:
- GENESIS_CORE_DB_URL
- database password
- private table grants
- raw SQL errors

## Detail surfaces

Protected detail and Atlas gates are NOT yet exposed by the new World bridge.

Legacy detail scope currently exists only for:
- monsters
- maps
- items

Legacy Atlas gate data combines canonical entity identity, reveal plans, public projection and published-story evidence.

Before migrating detail/Codex, create separate narrowly-scoped bridge contracts rather than granting access to the underlying private tables.

## Hard rules

- World Admin is read-only during this migration.
- Database change proposals remain disabled until a separate Platform-owned proposal/control design is approved.
- Canonical Core records are not copied wholesale into Platform.
- Codex reader reveal state is not inferred from backend completeness.
- Art approval cannot promote Codex reveal gates.
- No Core write bridge.
- No widening genesis_bridge_login access.
