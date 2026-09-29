-- Contract test: protected Admin Atlas gate detail.
-- Read-only. Fails if the gate contract or execution privileges become unsafe.

do $test$
declare
  v_actor text;
  v_entity_id uuid;
  v_result jsonb;
begin
  select ap.email
    into v_actor
  from genesis_private.admin_principals ap
  where ap.status='ENABLED'
    and ap.is_owner=true
  order by ap.created_at
  limit 1;

  if v_actor is null then
    raise exception 'ATLAS_GATE_TEST_REQUIRES_ENABLED_OWNER';
  end if;

  select ge.id
    into v_entity_id
  from public.game_entities ge
  where ge.entity_code='MON-000001'
    and ge.entity_type='monster'
  limit 1;

  if v_entity_id is null then
    select ge.id
      into v_entity_id
    from public.game_entities ge
    where ge.entity_type='monster'
    order by ge.entity_code
    limit 1;
  end if;

  if v_entity_id is null then
    raise exception 'ATLAS_GATE_TEST_REQUIRES_MONSTER_ENTITY';
  end if;

  v_result := public.genesis_admin_atlas_gate_detail(v_actor,v_entity_id);

  if v_result->>'contract_version' <> 'GENESIS-ATLAS-GATE-V1' then
    raise exception 'ATLAS_GATE_CONTRACT_VERSION_MISMATCH';
  end if;

  if coalesce(v_result->>'current_gate','') not in
    ('HIDDEN','RUMORED','DISCOVERED','ENCOUNTERED','ANALYZED','MASTERED') then
    raise exception 'ATLAS_GATE_INVALID_CURRENT_GATE: %', v_result->>'current_gate';
  end if;

  if coalesce((v_result#>>'{safety,fail_closed}')::boolean,false) is not true then
    raise exception 'ATLAS_GATE_MUST_FAIL_CLOSED';
  end if;

  if coalesce((v_result#>>'{safety,art_never_promotes_gate}')::boolean,false) is not true then
    raise exception 'ATLAS_GATE_ART_PROMOTION_GUARD_MISSING';
  end if;

  if jsonb_typeof(v_result#>'{reader_fields,hidden_fields}') <> 'array' then
    raise exception 'ATLAS_GATE_HIDDEN_FIELDS_MUST_BE_ARRAY';
  end if;

  if jsonb_array_length(coalesce(v_result->'gates','[]'::jsonb)) <> 6 then
    raise exception 'ATLAS_GATE_EXPECTED_SIX_STATES';
  end if;

  if has_function_privilege('anon','public.genesis_admin_atlas_gate_detail(text,uuid)','EXECUTE') then
    raise exception 'ATLAS_GATE_ANON_EXECUTE_MUST_BE_REVOKED';
  end if;

  if has_function_privilege('authenticated','public.genesis_admin_atlas_gate_detail(text,uuid)','EXECUTE') then
    raise exception 'ATLAS_GATE_AUTHENTICATED_EXECUTE_MUST_BE_REVOKED';
  end if;

  if not has_function_privilege('service_role','public.genesis_admin_atlas_gate_detail(text,uuid)','EXECUTE') then
    raise exception 'ATLAS_GATE_SERVICE_ROLE_EXECUTE_REQUIRED';
  end if;
end;
$test$;
