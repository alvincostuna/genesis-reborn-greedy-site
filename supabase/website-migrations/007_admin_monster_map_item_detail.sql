-- GENESIS protected Admin: canonical Monster / Map / Item detail contract.
-- Read-only. Does not mutate story production, releases, canon, or reader visibility.

create or replace function public.genesis_admin_entity_detail_v2(
  p_actor text,
  p_entity_id uuid,
  p_domain text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog','pg_temp'
as $function$
declare
  v_domain text := lower(btrim(coalesce(p_domain,'')));
  v_entity_code text;
  v_entity_type text;
  v_canonical_name text;
  v_public_name text;
  v_entity_status text;
  v_first_public_part_id uuid;
  v_detail jsonb := '{}'::jsonb;
begin
  perform public.genesis_admin_authorize(p_actor,'DATABASE_VIEW');

  if v_domain not in ('monsters','maps','items') then
    raise exception 'INVALID_PROTECTED_DETAIL_DOMAIN: %', p_domain
      using errcode='22023';
  end if;

  select
    ge.entity_code,
    ge.entity_type,
    ge.canonical_name,
    ge.public_name,
    ge.status,
    ge.first_public_part_id
  into
    v_entity_code,
    v_entity_type,
    v_canonical_name,
    v_public_name,
    v_entity_status,
    v_first_public_part_id
  from public.game_entities ge
  where ge.id=p_entity_id;

  if v_entity_code is null then
    raise exception 'PROTECTED_DETAIL_ENTITY_NOT_FOUND'
      using errcode='P0002';
  end if;

  if v_domain='monsters' then
    if not exists (
      select 1 from genesis_private.monster_master m where m.entity_id=p_entity_id
    ) then
      raise exception 'PROTECTED_DETAIL_DOMAIN_MISMATCH: monsters'
        using errcode='22023';
    end if;

    select jsonb_build_object(
      'master',to_jsonb(m.*),
      'taxonomy',jsonb_build_object(
        'race',(select to_jsonb(r.*) from genesis_private.monster_race_catalog r where r.race_key=m.race_key limit 1),
        'property',(select to_jsonb(p.*) from genesis_private.monster_property_catalog p where p.property_key=m.property_key limit 1),
        'rank',(select to_jsonb(rp.*) from genesis_private.monster_rank_profiles rp where upper(rp.rank_key)=upper(coalesce(m.rarity_class,m.rank)) limit 1)
      ),
      'runtime_profiles',jsonb_build_object(
        'derived',(select to_jsonb(x.*) from genesis_private.monster_runtime_derived_profiles_v1 x where x.monster_entity_id=p_entity_id order by x.level desc limit 1),
        'cognition',(select to_jsonb(x.*) from genesis_private.monster_cognition_profiles x where x.monster_entity_id=p_entity_id limit 1),
        'taming',(select to_jsonb(x.*) from genesis_private.monster_taming_profiles x where x.monster_entity_id=p_entity_id limit 1),
        'spawn_rarity',(select to_jsonb(x.*) from genesis_private.monster_spawn_rarity_assignment x where x.monster_entity_id=p_entity_id limit 1),
        'identification',(select to_jsonb(x.*) from genesis_private.monster_identification_visibility_v14_15 x
          where x.monster_ref in (p_entity_id::text,'CANON:'||p_entity_id::text) limit 1)
      ),
      'skills',coalesce((
        select jsonb_agg(jsonb_build_object(
          'assignment',to_jsonb(a.*),
          'skill_id',s.entity_id,
          'skill_code',sge.entity_code,
          'skill_name',sge.canonical_name,
          'skill_type',s.skill_type,
          'rank_max',s.rank_max,
          'sp_cost',s.sp_cost,
          'power_coefficient',s.power_coefficient,
          'flat_power',s.flat_power,
          'accuracy_bonus',s.accuracy_bonus,
          'cooldown_seconds',s.cooldown_seconds,
          'requirements',s.requirements,
          'effect_ids',s.effect_ids,
          'visibility',s.visibility,
          'description_private',s.description_private,
          'backend_status',s.backend_status
        ) order by a.slot_key,sge.entity_code)
        from genesis_private.entity_skill_assignments a
        join public.game_entities sge on sge.id=a.skill_entity_id
        left join genesis_private.skill_master s on s.entity_id=a.skill_entity_id
        where a.owner_entity_id=p_entity_id
      ),'[]'::jsonb),
      'spawns',coalesce((
        select jsonb_agg(jsonb_build_object(
          'spawn',to_jsonb(sp.*),
          'map_id',sp.map_entity_id,
          'map_code',mge.entity_code,
          'map_name',mge.canonical_name,
          'zone_id',sp.zone_id,
          'zone_name',z.canonical_name
        ) order by mge.entity_code,sp.spawn_key)
        from genesis_private.spawn_profiles sp
        join public.game_entities mge on mge.id=sp.map_entity_id
        left join genesis_private.map_zones z on z.id=sp.zone_id
        where sp.monster_entity_id=p_entity_id
      ),'[]'::jsonb),
      'loot_table',(
        select jsonb_build_object(
          'id',lt.id,
          'loot_key',lt.loot_key,
          'loot_policy',lt.loot_policy,
          'visibility',lt.visibility,
          'backend_status',lt.backend_status
        )
        from genesis_private.loot_table_master lt
        where lt.id=m.loot_table_id or lt.source_entity_id=p_entity_id
        order by case when lt.id=m.loot_table_id then 0 else 1 end
        limit 1
      ),
      'loot',coalesce((
        select jsonb_agg(jsonb_build_object(
          'entry_id',le.id,
          'drop_class',le.drop_class,
          'quantity_min',le.quantity_min,
          'quantity_max',le.quantity_max,
          'drop_rate',le.drop_rate,
          'conditions',le.condition_json,
          'item_id',le.item_entity_id,
          'item_code',ige.entity_code,
          'item_name',ige.canonical_name,
          'item_category',im.category,
          'item_subtype',im.subtype,
          'item_rarity',im.rarity
        ) order by le.drop_rate desc nulls last,ige.entity_code)
        from genesis_private.loot_entries le
        left join public.game_entities ige on ige.id=le.item_entity_id
        left join genesis_private.item_master im on im.entity_id=le.item_entity_id
        where le.source_entity_id=p_entity_id
           or (m.loot_table_id is not null and le.loot_table_id=m.loot_table_id)
      ),'[]'::jsonb),
      'counts',jsonb_build_object(
        'skills',(select count(*) from genesis_private.entity_skill_assignments a where a.owner_entity_id=p_entity_id),
        'spawn_profiles',(select count(*) from genesis_private.spawn_profiles sp where sp.monster_entity_id=p_entity_id),
        'loot_entries',(select count(*) from genesis_private.loot_entries le
          where le.source_entity_id=p_entity_id or (m.loot_table_id is not null and le.loot_table_id=m.loot_table_id))
      )
    )
    into v_detail
    from genesis_private.monster_master m
    where m.entity_id=p_entity_id;

  elsif v_domain='maps' then
    if not exists (
      select 1 from genesis_private.map_master m where m.entity_id=p_entity_id
    ) then
      raise exception 'PROTECTED_DETAIL_DOMAIN_MISMATCH: maps'
        using errcode='22023';
    end if;

    select jsonb_build_object(
      'master',to_jsonb(m.*),
      'ecology',(select to_jsonb(e.*) from genesis_private.map_ecology_policy e where e.map_entity_id=p_entity_id limit 1),
      'zones',coalesce((
        select jsonb_agg(to_jsonb(z.*) order by z.sequence_order,z.zone_key)
        from genesis_private.map_zones z
        where z.map_entity_id=p_entity_id
      ),'[]'::jsonb),
      'landmarks',coalesce((
        select jsonb_agg(to_jsonb(l.*) order by l.landmark_key)
        from genesis_private.map_landmarks l
        where l.map_entity_id=p_entity_id
      ),'[]'::jsonb),
      'routes',coalesce((
        select jsonb_agg(jsonb_build_object(
          'route',to_jsonb(r.*),
          'origin_code',oge.entity_code,
          'origin_name',oge.canonical_name,
          'destination_code',dge.entity_code,
          'destination_name',dge.canonical_name
        ) order by r.route_key)
        from genesis_private.map_routes r
        left join public.game_entities oge on oge.id=r.origin_map_entity_id
        left join public.game_entities dge on dge.id=r.destination_map_entity_id
        where r.origin_map_entity_id=p_entity_id or r.destination_map_entity_id=p_entity_id
      ),'[]'::jsonb),
      'spawns',coalesce((
        select jsonb_agg(jsonb_build_object(
          'spawn',to_jsonb(sp.*),
          'monster_id',sp.monster_entity_id,
          'monster_code',mge.entity_code,
          'monster_name',mge.canonical_name,
          'monster_rank',mm.rank,
          'monster_level_min',mm.level_min,
          'monster_level_max',mm.level_max,
          'monster_rarity',mm.rarity_class,
          'zone_name',z.canonical_name
        ) order by mge.entity_code,sp.spawn_key)
        from genesis_private.spawn_profiles sp
        join public.game_entities mge on mge.id=sp.monster_entity_id
        left join genesis_private.monster_master mm on mm.entity_id=sp.monster_entity_id
        left join genesis_private.map_zones z on z.id=sp.zone_id
        where sp.map_entity_id=p_entity_id
      ),'[]'::jsonb),
      'npcs',coalesce((
        select jsonb_agg(jsonb_build_object(
          'entity_id',n.entity_id,
          'code',nge.entity_code,
          'name',nge.canonical_name,
          'role',n.role,
          'faction',n.faction,
          'services',n.services,
          'backend_status',n.backend_status
        ) order by nge.entity_code)
        from genesis_private.npc_master n
        join public.game_entities nge on nge.id=n.entity_id
        where n.map_entity_id=p_entity_id
      ),'[]'::jsonb),
      'shops',coalesce((
        select jsonb_agg(jsonb_build_object(
          'entity_id',s.entity_id,
          'code',sge.entity_code,
          'name',sge.canonical_name,
          'shop_type',s.shop_type,
          'currency',s.currency,
          'npc_entity_id',s.npc_entity_id,
          'npc_name',nge.canonical_name,
          'restock_rule',s.restock_rule,
          'backend_status',s.backend_status
        ) order by sge.entity_code)
        from genesis_private.shop_master s
        join public.game_entities sge on sge.id=s.entity_id
        left join public.game_entities nge on nge.id=s.npc_entity_id
        where s.map_entity_id=p_entity_id
      ),'[]'::jsonb),
      'counts',jsonb_build_object(
        'zones',(select count(*) from genesis_private.map_zones z where z.map_entity_id=p_entity_id),
        'landmarks',(select count(*) from genesis_private.map_landmarks l where l.map_entity_id=p_entity_id),
        'routes',(select count(*) from genesis_private.map_routes r where r.origin_map_entity_id=p_entity_id or r.destination_map_entity_id=p_entity_id),
        'spawn_profiles',(select count(*) from genesis_private.spawn_profiles sp where sp.map_entity_id=p_entity_id),
        'monster_species',(select count(distinct sp.monster_entity_id) from genesis_private.spawn_profiles sp where sp.map_entity_id=p_entity_id),
        'npcs',(select count(*) from genesis_private.npc_master n where n.map_entity_id=p_entity_id),
        'shops',(select count(*) from genesis_private.shop_master s where s.map_entity_id=p_entity_id)
      )
    )
    into v_detail
    from genesis_private.map_master m
    where m.entity_id=p_entity_id;

  elsif v_domain='items' then
    if not exists (
      select 1 from genesis_private.item_master i where i.entity_id=p_entity_id
    ) then
      raise exception 'PROTECTED_DETAIL_DOMAIN_MISMATCH: items'
        using errcode='22023';
    end if;

    select jsonb_build_object(
      'master',to_jsonb(i.*),
      'equipment',jsonb_build_object(
        'weapon',(select to_jsonb(w.*) from genesis_private.weapon_master w where w.item_entity_id=p_entity_id limit 1),
        'armor',(select to_jsonb(a.*) from genesis_private.armor_master a where a.item_entity_id=p_entity_id limit 1),
        'accessory',(select to_jsonb(a.*) from genesis_private.accessory_master a where a.item_entity_id=p_entity_id limit 1),
        'use_profile',(select to_jsonb(u.*) from genesis_private.equipment_use_profiles u where u.item_entity_id=p_entity_id limit 1)
      ),
      'lifecycle',jsonb_build_object(
        'identification',(select to_jsonb(x.*) from genesis_private.item_identification_profiles x where x.item_entity_id=p_entity_id limit 1),
        'enhancement',(select to_jsonb(x.*) from genesis_private.item_enhancement_profiles x where x.item_entity_id=p_entity_id limit 1),
        'sockets',(select to_jsonb(x.*) from genesis_private.item_socket_profiles x where x.item_entity_id=p_entity_id limit 1)
      ),
      'drop_sources',coalesce((
        select jsonb_agg(jsonb_build_object(
          'source_entity_id',le.source_entity_id,
          'source_code',sge.entity_code,
          'source_name',sge.canonical_name,
          'source_type',sge.entity_type,
          'loot_table_id',le.loot_table_id,
          'drop_class',le.drop_class,
          'quantity_min',le.quantity_min,
          'quantity_max',le.quantity_max,
          'drop_rate',le.drop_rate,
          'conditions',le.condition_json
        ) order by le.drop_rate desc nulls last,sge.entity_code)
        from genesis_private.loot_entries le
        left join public.game_entities sge on sge.id=le.source_entity_id
        where le.item_entity_id=p_entity_id
      ),'[]'::jsonb),
      'shops',coalesce((
        select jsonb_agg(jsonb_build_object(
          'inventory',to_jsonb(si.*),
          'shop_code',sge.entity_code,
          'shop_name',sge.canonical_name,
          'shop_type',sm.shop_type,
          'map_id',sm.map_entity_id,
          'map_name',mge.canonical_name,
          'npc_id',sm.npc_entity_id,
          'npc_name',nge.canonical_name,
          'currency',sm.currency
        ) order by sge.entity_code)
        from genesis_private.shop_inventory si
        join genesis_private.shop_master sm on sm.entity_id=si.shop_entity_id
        join public.game_entities sge on sge.id=si.shop_entity_id
        left join public.game_entities mge on mge.id=sm.map_entity_id
        left join public.game_entities nge on nge.id=sm.npc_entity_id
        where si.item_entity_id=p_entity_id
      ),'[]'::jsonb),
      'vendor_overrides',coalesce((
        select jsonb_agg(jsonb_build_object(
          'override',to_jsonb(v.*),
          'shop_code',sge.entity_code,
          'shop_name',sge.canonical_name
        ) order by sge.entity_code,v.currency)
        from genesis_private.vendor_item_price_overrides v
        left join public.game_entities sge on sge.id=v.shop_entity_id
        where v.item_entity_id=p_entity_id
      ),'[]'::jsonb),
      'world_distribution',coalesce((
        select jsonb_agg(to_jsonb(d.*) order by d.map_key,d.source_monster_key)
        from genesis_private.equipment_map_distribution_v1 d
        where d.equipment_key in (v_entity_code,v_canonical_name)
      ),'[]'::jsonb),
      'world_presence',(
        select to_jsonb(wp.*)
        from genesis_private.equipment_world_presence_v1 wp
        where wp.equipment_key in (v_entity_code,v_canonical_name)
        order by wp.updated_at desc
        limit 1
      ),
      'counts',jsonb_build_object(
        'drop_sources',(select count(*) from genesis_private.loot_entries le where le.item_entity_id=p_entity_id),
        'shop_listings',(select count(*) from genesis_private.shop_inventory si where si.item_entity_id=p_entity_id),
        'vendor_overrides',(select count(*) from genesis_private.vendor_item_price_overrides v where v.item_entity_id=p_entity_id),
        'world_distribution_rows',(select count(*) from genesis_private.equipment_map_distribution_v1 d where d.equipment_key in (v_entity_code,v_canonical_name))
      )
    )
    into v_detail
    from genesis_private.item_master i
    where i.entity_id=p_entity_id;
  end if;

  return jsonb_build_object(
    'contract_version','GENESIS-ADMIN-ENTITY-DETAIL-V2',
    'domain',v_domain,
    'entity',jsonb_build_object(
      'id',p_entity_id,
      'code',v_entity_code,
      'type',v_entity_type,
      'canonical_name',v_canonical_name,
      'public_name',v_public_name,
      'status',v_entity_status,
      'first_public_part_id',v_first_public_part_id
    ),
    'detail',coalesce(v_detail,'{}'::jsonb),
    'safety',jsonb_build_object(
      'protected_admin_only',true,
      'read_only',true,
      'reader_visibility_not_changed',true,
      'story_production_not_changed',true
    )
  );
end;
$function$;

revoke execute on function public.genesis_admin_entity_detail_v2(text,uuid,text) from public, anon, authenticated;
grant execute on function public.genesis_admin_entity_detail_v2(text,uuid,text) to service_role;
