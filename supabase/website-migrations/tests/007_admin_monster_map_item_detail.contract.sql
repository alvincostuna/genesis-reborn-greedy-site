-- Contract test: protected Admin Monster / Map / Item detail.
-- Read-only and fail-closed.

do $test$
declare
  v_actor text;
  v_monster uuid;
  v_map uuid;
  v_item uuid;
  v_result jsonb;
begin
  select ap.email into v_actor
  from genesis_private.admin_principals ap
  where ap.status='ENABLED' and ap.is_owner=true
  order by ap.created_at
  limit 1;

  if v_actor is null then
    raise exception 'ENTITY_DETAIL_TEST_REQUIRES_ENABLED_OWNER';
  end if;

  select ge.id into v_monster
  from public.game_entities ge
  join genesis_private.monster_master m on m.entity_id=ge.id
  order by ge.entity_code
  limit 1;

  select ge.id into v_map
  from public.game_entities ge
  join genesis_private.map_master m on m.entity_id=ge.id
  order by ge.entity_code
  limit 1;

  select ge.id into v_item
  from public.game_entities ge
  join genesis_private.item_master i on i.entity_id=ge.id
  order by ge.entity_code
  limit 1;

  if v_monster is null or v_map is null or v_item is null then
    raise exception 'ENTITY_DETAIL_TEST_REQUIRES_ALL_THREE_DOMAINS';
  end if;

  v_result := public.genesis_admin_entity_detail_v2(v_actor,v_monster,'monsters');
  if v_result->>'contract_version' <> 'GENESIS-ADMIN-ENTITY-DETAIL-V2'
     or v_result->>'domain' <> 'monsters'
     or v_result#>'{detail,master}' is null
     or jsonb_typeof(v_result#>'{detail,skills}') <> 'array'
     or jsonb_typeof(v_result#>'{detail,spawns}') <> 'array'
     or jsonb_typeof(v_result#>'{detail,loot}') <> 'array' then
    raise exception 'MONSTER_DETAIL_CONTRACT_FAILED';
  end if;

  v_result := public.genesis_admin_entity_detail_v2(v_actor,v_map,'maps');
  if v_result->>'domain' <> 'maps'
     or v_result#>'{detail,master}' is null
     or jsonb_typeof(v_result#>'{detail,routes}') <> 'array'
     or jsonb_typeof(v_result#>'{detail,spawns}') <> 'array'
     or jsonb_typeof(v_result#>'{detail,npcs}') <> 'array'
     or jsonb_typeof(v_result#>'{detail,shops}') <> 'array' then
    raise exception 'MAP_DETAIL_CONTRACT_FAILED';
  end if;

  v_result := public.genesis_admin_entity_detail_v2(v_actor,v_item,'items');
  if v_result->>'domain' <> 'items'
     or v_result#>'{detail,master}' is null
     or jsonb_typeof(v_result#>'{detail,drop_sources}') <> 'array'
     or jsonb_typeof(v_result#>'{detail,shops}') <> 'array'
     or jsonb_typeof(v_result#>'{detail,vendor_overrides}') <> 'array' then
    raise exception 'ITEM_DETAIL_CONTRACT_FAILED';
  end if;

  if coalesce((v_result#>>'{safety,protected_admin_only}')::boolean,false) is not true
     or coalesce((v_result#>>'{safety,read_only}')::boolean,false) is not true
     or coalesce((v_result#>>'{safety,reader_visibility_not_changed}')::boolean,false) is not true
     or coalesce((v_result#>>'{safety,story_production_not_changed}')::boolean,false) is not true then
    raise exception 'ENTITY_DETAIL_SAFETY_CONTRACT_FAILED';
  end if;

  if has_function_privilege('anon','public.genesis_admin_entity_detail_v2(text,uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public.genesis_admin_entity_detail_v2(text,uuid,text)','EXECUTE') then
    raise exception 'ENTITY_DETAIL_PUBLIC_EXECUTE_MUST_BE_REVOKED';
  end if;

  if not has_function_privilege('service_role','public.genesis_admin_entity_detail_v2(text,uuid,text)','EXECUTE') then
    raise exception 'ENTITY_DETAIL_SERVICE_ROLE_EXECUTE_REQUIRED';
  end if;
end;
$test$;
