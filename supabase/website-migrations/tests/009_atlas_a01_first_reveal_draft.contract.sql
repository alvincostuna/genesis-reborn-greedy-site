-- Contract test: Atlas A01 reveal is prepared but not published by preparation alone.
do $test$
declare
  v_status text;
  v_first_public uuid;
  v_entity_status text;
  v_index jsonb;
begin
  select rp.status
    into v_status
  from genesis_private.roadmap_public_reveal_plan rp
  where rp.roadmap_version_id='eb89b0a1-36e1-4239-9368-e370a259bc9b'::uuid
    and rp.entity_id='05e07106-0008-47e1-af93-247810ca7b34'::uuid
    and rp.roadmap_part_id='6ec918a4-17bd-488e-a79f-b79856b77e83'::uuid
    and rp.reveal_kind='FIRST_PUBLIC'
  order by rp.created_at desc
  limit 1;

  if v_status <> 'DRAFT' then
    raise exception 'ATLAS_A01_FIRST_REVEAL_MUST_REMAIN_DRAFT';
  end if;

  select ge.first_public_part_id,ge.status
    into v_first_public,v_entity_status
  from public.game_entities ge
  where ge.id='05e07106-0008-47e1-af93-247810ca7b34'::uuid;

  if v_first_public is null then
    v_index := public.api_atlas_map_index_v1(null,100);
    if exists (
      select 1 from jsonb_array_elements(coalesce(v_index->'maps','[]'::jsonb)) x
      where x->>'entity_code'='MAP-000001'
    ) then
      raise exception 'ATLAS_A01_DRAFT_REVEAL_LEAKED_TO_READER';
    end if;
  end if;
end;
$test$;
