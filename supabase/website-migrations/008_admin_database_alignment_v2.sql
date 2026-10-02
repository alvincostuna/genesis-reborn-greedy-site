-- GENESIS Website/Admin database alignment V2
-- Mirrors live migration 20261002015950 website_admin_database_alignment_v2_20261002.
-- Protected Admin read contracts only. No runtime activation or reader visibility changes.

create or replace view genesis_private.admin_game_database_expanded_index_v2
with (security_invoker = true)
as
 SELECT 'monster_catalog'::text AS domain,
    COALESCE(m.canonical_entity_id::text, m.candidate_key, m.monster_ref) AS record_id,
    COALESCE(m.monster_ref, m.candidate_key) AS code,
    COALESCE(m.display_name, m.monster_ref, m.candidate_key) AS name,
    COALESCE(m.website_status, m.reveal_state, 'UNKNOWN'::text) AS status,
    jsonb_build_object('source_kind', m.source_kind, 'level_min', m.level_min, 'level_max', m.level_max, 'rank', m.rank_key, 'race', m.race_key, 'species', m.species_key, 'family', m.family_key, 'reveal_state', m.reveal_state, 'website_status', m.website_status) AS meta
   FROM genesis_private.monster_public_bestiary_projection_v1 m
UNION ALL
 SELECT 'equipment_catalog'::text AS domain,
    e.equipment_key AS record_id,
    e.equipment_key AS code,
    COALESCE(( SELECT c.equipment_name
           FROM genesis_private.world_expansion_equipment_candidates_v1 c
          WHERE c.equipment_key = e.equipment_key
         LIMIT 1), e.equipment_key) AS name,
    e.mechanics_state AS status,
    jsonb_build_object('catalog_layer', e.catalog_layer, 'simulator_scope', e.simulator_scope, 'runtime_authorized', e.runtime_authorized, 'unresolved_gaps', to_jsonb(e.unresolved_gaps)) AS meta
   FROM genesis_private.equipment_simulator_readiness_v3 e
UNION ALL
 SELECT 'shops'::text AS domain,
    s.entity_id::text AS record_id,
    ge.entity_code AS code,
    ge.canonical_name AS name,
    s.backend_status AS status,
    jsonb_build_object('shop_type', s.shop_type, 'currency', s.currency, 'map_entity_id', s.map_entity_id, 'npc_entity_id', s.npc_entity_id, 'revision', s.revision) AS meta
   FROM genesis_private.shop_master s
     JOIN public.game_entities ge ON ge.id = s.entity_id
UNION ALL
 SELECT 'routes'::text AS domain,
    r.id::text AS record_id,
    r.route_key AS code,
    r.canonical_name AS name,
    r.backend_status AS status,
    jsonb_build_object('route_kind', r.route_kind, 'origin', oge.canonical_name, 'destination', dge.canonical_name, 'distance_units', r.distance_units, 'base_travel_seconds', r.base_travel_seconds, 'terrain_type', r.terrain_type, 'road_quality', r.road_quality, 'danger_rating', r.danger_rating, 'is_active', r.is_active, 'allowed_movement_modes', r.allowed_movement_modes) AS meta
   FROM genesis_private.map_routes r
     LEFT JOIN public.game_entities oge ON oge.id = r.origin_map_entity_id
     LEFT JOIN public.game_entities dge ON dge.id = r.destination_map_entity_id
UNION ALL
 SELECT 'civilizations'::text AS domain,
    c.civilization_key AS record_id,
    c.civilization_key AS code,
    c.display_name AS name,
    c.canon_status AS status,
    jsonb_build_object('race_label', c.race_label, 'civilization_kind', c.civilization_kind, 'intelligent_society', c.intelligent_society, 'runtime_enabled', c.runtime_enabled, 'authority_key', c.authority_key) AS meta
   FROM genesis_private.civilization_profiles_v1 c
UNION ALL
 SELECT 'races'::text AS domain,
    x.record_id,
    x.code,
    x.name,
    x.status,
    x.meta
   FROM ( SELECT 'dwarf:'::text || r.branch_key AS record_id,
            r.branch_key AS code,
            r.display_name AS name,
            r.canon_status AS status,
            jsonb_build_object('race_family', 'DWARF', 'parent_key', r.parent_key, 'structure_level', r.structure_level, 'taxonomy_scope', r.taxonomy_scope, 'player_availability', r.player_availability, 'runtime_enabled', r.runtime_enabled) AS meta
           FROM genesis_private.dwarf_race_structure_v1 r
        UNION ALL
         SELECT 'elf:'::text || r.branch_key,
            r.branch_key,
            r.display_name,
            r.canon_status,
            jsonb_build_object('race_family', 'ELF', 'parent_key', r.parent_key, 'structure_level', r.structure_level, 'taxonomy_scope', r.taxonomy_scope, 'player_availability', r.player_availability, 'runtime_enabled', r.runtime_enabled) AS jsonb_build_object
           FROM genesis_private.elf_race_structure_v1 r
        UNION ALL
         SELECT 'orc:'::text || r.branch_key,
            r.branch_key,
            r.display_name,
            r.canon_status,
            jsonb_build_object('race_family', 'ORC', 'parent_key', r.parent_key, 'structure_level', r.structure_level, 'taxonomy_scope', r.taxonomy_scope, 'player_availability', r.player_availability, 'runtime_enabled', r.runtime_enabled) AS jsonb_build_object
           FROM genesis_private.orc_race_structure_v1 r
        UNION ALL
         SELECT 'demon:'::text || r.branch_key,
            r.branch_key,
            r.display_name,
            r.canon_status,
            jsonb_build_object('race_family', 'DEMON', 'parent_key', r.parent_key, 'structure_level', r.structure_level, 'taxonomy_scope', r.taxonomy_scope, 'player_availability', r.player_availability, 'runtime_enabled', r.runtime_enabled) AS jsonb_build_object
           FROM genesis_private.demon_race_structure_v1 r
        UNION ALL
         SELECT 'undead:'::text || r.record_key,
            r.record_key,
            r.display_name,
            r.canon_status,
            jsonb_build_object('race_family', 'UNDEAD', 'runtime_enabled', r.runtime_enabled, 'entity_id', r.entity_id) AS jsonb_build_object
           FROM genesis_private.undead_taxonomy_v1 r) x
UNION ALL
 SELECT 'settlements'::text AS domain,
    x.record_id,
    x.code,
    x.name,
    x.status,
    x.meta
   FROM ( SELECT 'dwarf:'::text || s.settlement_key AS record_id,
            s.settlement_key AS code,
            s.display_name AS name,
            s.canon_status AS status,
            jsonb_build_object('civilization', 'DWARF', 'settlement_kind', s.settlement_kind, 'level_min', s.level_min, 'level_max', s.level_max, 'map_entity_id', s.map_entity_id, 'runtime_enabled', s.runtime_enabled) AS meta
           FROM genesis_private.dwarf_settlement_design_v1 s
        UNION ALL
         SELECT 'elf:'::text || s.settlement_key,
            s.settlement_key,
            s.display_name,
            s.canon_status,
            jsonb_build_object('civilization', 'ELF', 'settlement_kind', s.settlement_kind, 'level_min', s.level_min, 'level_max', s.level_max, 'map_entity_id', s.map_entity_id, 'runtime_enabled', s.runtime_enabled) AS jsonb_build_object
           FROM genesis_private.elf_settlement_design_v1 s
        UNION ALL
         SELECT 'orc:'::text || s.settlement_key,
            s.settlement_key,
            s.display_name,
            s.canon_status,
            jsonb_build_object('civilization', 'ORC', 'settlement_kind', s.settlement_kind, 'level_min', s.level_min, 'level_max', s.level_max, 'map_entity_id', s.map_entity_id, 'runtime_enabled', s.runtime_enabled) AS jsonb_build_object
           FROM genesis_private.orc_settlement_design_v1 s
        UNION ALL
         SELECT 'undead:'::text || s.record_key,
            s.record_key,
            s.display_name,
            s.canon_status,
            jsonb_build_object('civilization', 'UNDEAD', 'entity_id', s.entity_id, 'runtime_enabled', s.runtime_enabled) AS jsonb_build_object
           FROM genesis_private.undead_settlement_design_v1 s
        UNION ALL
         SELECT 'outlaw:'::text || s.settlement_key,
            s.settlement_key,
            s.display_name,
            s.canon_status,
            jsonb_build_object('civilization', 'OUTLAW', 'settlement_kind', s.settlement_type, 'map_entity_id', s.map_entity_id, 'materialization_status', s.materialization_status, 'runtime_enabled', s.runtime_enabled) AS jsonb_build_object
           FROM genesis_private.outlaw_settlement_design_v1 s) x
UNION ALL
 SELECT 'transport_modes'::text AS domain,
    t.mode_key AS record_id,
    t.mode_key AS code,
    t.display_name AS name,
    t.canon_status AS status,
    jsonb_build_object('mode_family', t.mode_family, 'movement_domain', t.movement_domain, 'minimum_player_level', t.minimum_player_level, 'minimum_guild_level', t.minimum_guild_level, 'runtime_enabled', t.runtime_enabled) AS meta
   FROM genesis_private.transport_mode_archetype_v1 t
UNION ALL
 SELECT 'transport_vehicles'::text AS domain,
    t.vehicle_key AS record_id,
    t.vehicle_key AS code,
    t.display_name AS name,
    t.canon_status AS status,
    jsonb_build_object('mode_key', t.mode_key, 'vehicle_class', t.vehicle_class, 'minimum_reference_level', t.minimum_reference_level, 'passenger_capacity_min', t.passenger_capacity_min, 'passenger_capacity_max', t.passenger_capacity_max, 'cargo_capacity_class', t.cargo_capacity_class, 'runtime_enabled', t.runtime_enabled) AS meta
   FROM genesis_private.transport_vehicle_archetype_v1 t
UNION ALL
 SELECT 'transport_nodes'::text AS domain,
    t.node_key AS record_id,
    t.node_key AS code,
    t.node_key AS name,
    t.canon_status AS status,
    jsonb_build_object('region', t.region, 'map_type', t.map_type, 'reference_level', t.reference_level, 'facility_key', t.facility_key, 'service_scope', t.service_scope, 'route_binding_status', t.route_binding_status, 'map_entity_id', t.map_entity_id, 'runtime_enabled', t.runtime_enabled) AS meta
   FROM genesis_private.transport_node_plan_v1 t
UNION ALL
 SELECT 'freight_corridors'::text AS domain,
    f.plan_key AS record_id,
    f.plan_key AS code,
    (f.origin_name || ' → '::text) || f.destination_name AS name,
    f.canon_status AS status,
    jsonb_build_object('route_class', f.route_class, 'route_form', f.route_form, 'progression_level_min', f.progression_level_min, 'progression_level_max', f.progression_level_max, 'distance_band', f.distance_band, 'construction_state', f.construction_state, 'freight_role', f.freight_role, 'materialization_status', f.materialization_status, 'runtime_enabled', f.runtime_enabled) AS meta
   FROM genesis_private.freight_corridor_materialization_spec_v1 f
UNION ALL
 SELECT 'competitions'::text AS domain,
    c.venue_key AS record_id,
    c.venue_key AS code,
    c.display_name AS name,
    c.canon_status AS status,
    jsonb_build_object('settlement_key', c.settlement_key, 'venue_type', c.venue_type_key, 'reference_level', c.reference_level, 'spectator_capacity', c.spectator_capacity, 'participant_capacity', c.participant_capacity, 'vendor_slot_capacity', c.vendor_slot_capacity, 'map_materialization_status', c.map_materialization_status, 'runtime_enabled', c.runtime_enabled) AS meta
   FROM genesis_private.competition_venue_design_v1 c
UNION ALL
 SELECT 'currencies'::text AS domain,
    c.currency_code AS record_id,
    c.currency_code AS code,
    c.display_name AS name,
    c.backend_status AS status,
    jsonb_build_object('currency_family', c.currency_family, 'issuer_scope', c.issuer_scope, 'conversion_mode', c.conversion_mode, 'market_tradeable', c.market_tradeable, 'php_exchange_allowed', c.php_exchange_allowed, 'race_or_faction_scope', c.race_or_faction_scope) AS meta
   FROM genesis_private.currency_catalog c
UNION ALL
 SELECT 'economy_levels'::text AS domain,
    e.level::text AS record_id,
    e.level::text AS code,
    'Level '::text || e.level::text AS name,
        CASE
            WHEN e.active THEN 'ACTIVE'::text
            ELSE 'INACTIVE'::text
        END AS status,
    jsonb_build_object('multiplier', e.multiplier, 'nominal_band', e.nominal_band, 'preferred_display_mode', e.preferred_display_mode, 'active', e.active) AS meta
   FROM genesis_private.economy_level_curve_v1 e
UNION ALL
 SELECT 'guild_skills'::text AS domain,
    g.skill_key AS record_id,
    g.skill_key AS code,
    g.skill_name AS name,
        CASE
            WHEN g.active THEN 'ACTIVE'::text
            ELSE 'INACTIVE'::text
        END AS status,
    jsonb_build_object('branch', g.branch, 'max_level', g.max_level, 'minimum_guild_level', g.minimum_guild_level, 'point_cost_per_level', g.point_cost_per_level, 'activation_type', g.activation_type, 'active', g.active) AS meta
   FROM genesis_private.guild_skill_master g
UNION ALL
 SELECT 'guild_facilities'::text AS domain,
    g.facility_type AS record_id,
    g.facility_type AS code,
    g.display_name AS name,
    g.canon_status AS status,
    jsonb_build_object('facility_domain', g.facility_domain, 'minimum_guild_level', g.minimum_guild_level, 'max_facility_level', g.max_facility_level, 'runtime_enabled', g.runtime_enabled) AS meta
   FROM genesis_private.guild_facility_archetype_v1 g
UNION ALL
 SELECT 'sea_corridors'::text AS domain,
    s.sea_contract_key AS record_id,
    s.sea_contract_key AS code,
    COALESCE(s.route_key, s.sea_contract_key) AS name,
    s.canon_status AS status,
    jsonb_build_object('route_key', s.route_key, 'origin_port_site', s.origin_port_site, 'destination_port_site', s.destination_port_site, 'passenger_mode_key', s.passenger_mode_key, 'freight_mode_key', s.freight_mode_key, 'operating_state', s.operating_state, 'runtime_enabled', s.runtime_enabled) AS meta
   FROM genesis_private.sea_corridor_contract_v1 s
UNION ALL
 SELECT 'maritime_rates'::text AS domain,
    m.rate_key AS record_id,
    m.rate_key AS code,
    m.display_name AS name,
    m.canon_status AS status,
    jsonb_build_object('rate_family', m.rate_family, 'base_copper', m.base_copper, 'resolved_copper', m.resolved_copper, 'pricing_unit', m.pricing_unit, 'reference_level', m.reference_level, 'runtime_charge_allowed', m.runtime_charge_allowed) AS meta
   FROM genesis_private.maritime_service_rate_v1 m;;

revoke all on genesis_private.admin_game_database_expanded_index_v2 from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.genesis_admin_game_database_summary_v2(p_actor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare
  v_core jsonb;
  v_expanded jsonb;
  v_public jsonb;
begin
  perform public.genesis_admin_authorize(p_actor,'DATABASE_VIEW');

  v_core := coalesce(public.genesis_admin_game_database_summary()->'counts','{}'::jsonb);

  select coalesce(jsonb_object_agg(domain,row_count order by domain),'{}'::jsonb)
    into v_expanded
  from (
    select domain,count(*)::int as row_count
    from genesis_private.admin_game_database_expanded_index_v2
    group by domain
  ) x;

  select coalesce(jsonb_object_agg(entity_type,
      jsonb_build_object('registered',registered,'reader_safe_now',reader_safe_now)
      order by entity_type
    ),'{}'::jsonb)
    into v_public
  from (
    select ge.entity_type,
      count(*)::int as registered,
      count(*) filter (
        where ge.status='active'
          and sp.canon_status='final'
          and sp.publication_status='published'
          and sp.publish_at is not null
          and sp.publish_at<=now()
      )::int as reader_safe_now
    from public.game_entities ge
    left join public.story_parts sp on sp.id=ge.first_public_part_id
    group by ge.entity_type
  ) p;

  return jsonb_build_object(
    'contract_version','GENESIS-ADMIN-DB-V2',
    'core_counts',v_core,
    'expanded_counts',v_expanded,
    'public_projection',v_public,
    'safety',jsonb_build_object(
      'expanded_domains_read_only',true,
      'public_visibility_unchanged',true,
      'runtime_activation_unchanged',true,
      'story_production_unchanged',true
    )
  );
end;
$function$

CREATE OR REPLACE FUNCTION public.genesis_admin_game_database_list_v2(p_actor text, p_domain text, p_query text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare
  v_domain text := lower(btrim(coalesce(p_domain,'')));
  v_query text := nullif(btrim(coalesce(p_query,'')),'');
  v_limit integer := greatest(1,least(coalesce(p_limit,50),200));
  v_offset integer := greatest(0,coalesce(p_offset,0));
  v_result jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_core_domains constant text[] := array[
    'monsters','classes','professions','skills','loot','maps','items','npcs','quests','crafting','companions'
  ];
  v_expanded_domains constant text[] := array[
    'monster_catalog','equipment_catalog','shops','routes','civilizations','races','settlements',
    'transport_modes','transport_vehicles','transport_nodes','freight_corridors','competitions',
    'currencies','economy_levels','guild_skills','guild_facilities','sea_corridors','maritime_rates'
  ];
begin
  perform public.genesis_admin_authorize(p_actor,'DATABASE_VIEW');

  if v_domain = any(v_core_domains) then
    v_result := public.genesis_admin_game_database_list(v_domain,v_query,v_limit,v_offset);
    return v_result || jsonb_build_object(
      'contract_version','GENESIS-ADMIN-DB-V2',
      'layer','CORE_DATABASE',
      'read_only',false
    );
  end if;

  if not (v_domain = any(v_expanded_domains)) then
    raise exception 'INVALID_ADMIN_DATABASE_DOMAIN: %', p_domain using errcode='22023';
  end if;

  select count(*) into v_total
  from genesis_private.admin_game_database_expanded_index_v2 x
  where x.domain=v_domain
    and (
      v_query is null
      or x.name ilike '%'||v_query||'%'
      or x.code ilike '%'||v_query||'%'
      or x.status ilike '%'||v_query||'%'
      or x.meta::text ilike '%'||v_query||'%'
    );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',x.record_id,
      'code',x.code,
      'name',x.name,
      'status',x.status,
      'meta',x.meta
    ) order by x.name,x.code
  ),'[]'::jsonb)
  into v_items
  from (
    select *
    from genesis_private.admin_game_database_expanded_index_v2 x
    where x.domain=v_domain
      and (
        v_query is null
        or x.name ilike '%'||v_query||'%'
        or x.code ilike '%'||v_query||'%'
        or x.status ilike '%'||v_query||'%'
        or x.meta::text ilike '%'||v_query||'%'
      )
    order by x.name,x.code
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object(
    'contract_version','GENESIS-ADMIN-DB-V2',
    'domain',v_domain,
    'layer','EXPANDED_DESIGN_REGISTRY',
    'read_only',true,
    'query',v_query,
    'limit',v_limit,
    'offset',v_offset,
    'total',v_total,
    'items',v_items,
    'safety',jsonb_build_object(
      'runtime_activation_unchanged',true,
      'public_visibility_unchanged',true,
      'story_production_unchanged',true
    )
  );
end;
$function$

revoke all on function public.genesis_admin_game_database_summary_v2(text) from public, anon, authenticated;
revoke all on function public.genesis_admin_game_database_list_v2(text,text,text,integer,integer) from public, anon, authenticated;

grant execute on function public.genesis_admin_game_database_summary_v2(text) to service_role;
grant execute on function public.genesis_admin_game_database_list_v2(text,text,text,integer,integer) to service_role;

comment on view genesis_private.admin_game_database_expanded_index_v2 is
'Protected read-only normalized index for post-V1 GENESIS design registries. Does not grant runtime or public visibility.';

comment on function public.genesis_admin_game_database_summary_v2(text) is
'Protected Admin DB V2 summary. Separates core canonical masters from expanded/dormant design registries and public reader-safe projection.';

comment on function public.genesis_admin_game_database_list_v2(text,text,text,integer,integer) is
'Protected Admin DB V2 browser. Existing V1 core domains preserve staged-edit behavior; expanded domains are read-only and do not alter runtime or reader visibility.';
