-- Contract test: reader-safe Atlas/search APIs.
-- Read-only; permits zero revealed entities during pre-launch.

do $test$
declare
  v_index jsonb;
  v_detail jsonb;
  v_slug text;
  v_search_count integer;
  v_expected_count integer;
begin
  v_index := public.api_atlas_map_index_v1(null,100);

  if v_index->>'contract_version' <> 'GENESIS-READER-ATLAS-INDEX-V1' then
    raise exception 'ATLAS_INDEX_CONTRACT_VERSION_MISMATCH';
  end if;

  if v_index->>'fog_policy' <> 'FAIL_CLOSED' then
    raise exception 'ATLAS_INDEX_MUST_FAIL_CLOSED';
  end if;

  if jsonb_typeof(v_index->'maps') <> 'array' then
    raise exception 'ATLAS_INDEX_MAPS_MUST_BE_ARRAY';
  end if;

  select count(*)::int
  into v_expected_count
  from public.game_entities ge
  join genesis_private.map_master mm on mm.entity_id=ge.id
  join public.story_parts sp on sp.id=ge.first_public_part_id
  where ge.entity_type='map'
    and ge.status='active'
    and sp.canon_status='final'
    and sp.publication_status='published'
    and sp.publish_at is not null
    and sp.publish_at<=now();

  if jsonb_array_length(v_index->'maps') <> least(v_expected_count,100) then
    raise exception 'ATLAS_INDEX_REVEAL_COUNT_MISMATCH';
  end if;

  select x->>'slug'
  into v_slug
  from jsonb_array_elements(v_index->'maps') x
  limit 1;

  if v_slug is not null then
    v_detail := public.api_atlas_map_detail_v1(v_slug);
    if v_detail is null
       or v_detail->>'contract_version' <> 'GENESIS-READER-ATLAS-DETAIL-V1'
       or v_detail->>'fog_policy' <> 'FAIL_CLOSED'
       or jsonb_typeof(v_detail->'connections') <> 'array'
       or jsonb_typeof(v_detail->'monsters') <> 'array'
       or jsonb_typeof(v_detail->'npcs') <> 'array'
       or jsonb_typeof(v_detail->'shops') <> 'array' then
      raise exception 'ATLAS_DETAIL_CONTRACT_FAILED';
    end if;

    if (v_detail->'map') ? 'level_min'
       or (v_detail->'map') ? 'danger_rating'
       or (v_detail->'map') ? 'spawn_profiles' then
      raise exception 'ATLAS_DETAIL_PRIVATE_FIELDS_LEAKED_TOP_LEVEL';
    end if;
  end if;

  select count(*)::int into v_search_count
  from public.api_entity_search_v2(null,null,100);

  if v_search_count > 100 then
    raise exception 'ENTITY_SEARCH_LIMIT_FAILED';
  end if;

  if exists (
    select 1
    from public.api_entity_search_v2(null,null,100) r
    join public.game_entities ge on ge.entity_code=r.entity_code
    left join public.story_parts sp on sp.id=ge.first_public_part_id
    where ge.status<>'active'
       or sp.id is null
       or sp.canon_status<>'final'
       or sp.publication_status<>'published'
       or sp.publish_at is null
       or sp.publish_at>now()
  ) then
    raise exception 'ENTITY_SEARCH_REVEAL_GATE_BYPASS';
  end if;

  if not has_function_privilege('anon','public.api_atlas_map_index_v1(text,integer)','EXECUTE')
     or not has_function_privilege('authenticated','public.api_atlas_map_index_v1(text,integer)','EXECUTE')
     or not has_function_privilege('anon','public.api_atlas_map_detail_v1(text)','EXECUTE')
     or not has_function_privilege('authenticated','public.api_atlas_map_detail_v1(text)','EXECUTE')
     or not has_function_privilege('anon','public.api_entity_search_v2(text,text,integer)','EXECUTE') then
    raise exception 'READER_ATLAS_EXECUTE_GRANTS_MISSING';
  end if;
end;
$test$;
