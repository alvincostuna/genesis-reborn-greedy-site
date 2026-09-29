-- GENESIS protected Admin: reader-safe Atlas gate detail contract
-- Read-only function. No story-production or public-visibility mutation.

create or replace function public.genesis_admin_atlas_gate_detail(
  p_actor text,
  p_entity_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog','pg_temp'
as $function$
declare
  v_entity_id uuid;
  v_entity_code text;
  v_entity_type text;
  v_canonical_name text;
  v_public_name text;
  v_entity_status text;
  v_first_public_part_id uuid;

  v_projection_gate text := 'HIDDEN';
  v_projection_requirements jsonb := '{}'::jsonb;
  v_projection_safe_fields jsonb := '[]'::jsonb;
  v_projection_hidden_fields jsonb := '[]'::jsonb;
  v_projection_website_status text := 'NOT_REGISTERED';
  v_projection_updated_at timestamptz;

  v_first_public_json jsonb := null;
  v_first_public_executed boolean := false;
  v_active_plan_json jsonb := null;
  v_historical_plan_json jsonb := null;
  v_revealed_fields jsonb := '[]'::jsonb;
  v_current_gate text := 'HIDDEN';
begin
  perform public.genesis_admin_authorize(p_actor,'DATABASE_VIEW');

  select
    ge.id, ge.entity_code, ge.entity_type, ge.canonical_name, ge.public_name,
    ge.status, ge.first_public_part_id
  into
    v_entity_id, v_entity_code, v_entity_type, v_canonical_name, v_public_name,
    v_entity_status, v_first_public_part_id
  from public.game_entities ge
  where ge.id=p_entity_id;

  if v_entity_id is null then
    raise exception 'ATLAS_ENTITY_NOT_FOUND'
      using errcode='P0002';
  end if;

  if v_entity_type='monster' then
    select
      upper(coalesce(mb.reveal_state,'HIDDEN')),
      coalesce(mb.reveal_requirements,'{}'::jsonb),
      coalesce(mb.safe_fields,'[]'::jsonb),
      coalesce(mb.hidden_fields,'[]'::jsonb),
      coalesce(mb.website_status,'NOT_REGISTERED'),
      mb.updated_at
    into
      v_projection_gate,
      v_projection_requirements,
      v_projection_safe_fields,
      v_projection_hidden_fields,
      v_projection_website_status,
      v_projection_updated_at
    from genesis_private.monster_public_bestiary_projection_v1 mb
    where mb.canonical_entity_id=p_entity_id
    order by mb.updated_at desc
    limit 1;

    v_projection_gate := coalesce(v_projection_gate,'HIDDEN');
    if v_projection_gate not in ('HIDDEN','RUMORED','DISCOVERED','ENCOUNTERED','ANALYZED','MASTERED') then
      v_projection_gate := 'HIDDEN';
    end if;
  end if;

  if v_first_public_part_id is not null then
    select jsonb_build_object(
      'part_id',sp.id,
      'part_key',sp.part_key,
      'title',sp.title,
      'canon_status',sp.canon_status,
      'publication_status',sp.publication_status,
      'publish_at',sp.publish_at
    ),
    (
      sp.canon_status='final'
      and sp.publication_status='published'
      and sp.publish_at is not null
      and sp.publish_at<=now()
    )
    into v_first_public_json, v_first_public_executed
    from public.story_parts sp
    where sp.id=v_first_public_part_id
    limit 1;
  end if;

  select coalesce(jsonb_agg(distinct er.field_key order by er.field_key),'[]'::jsonb)
  into v_revealed_fields
  from public.entity_reveals er
  join public.story_parts sp on sp.id=er.reveal_part_id
  where er.entity_id=p_entity_id
    and sp.canon_status='final'
    and sp.publication_status='published'
    and sp.publish_at is not null
    and sp.publish_at<=now();

  select jsonb_build_object(
    'roadmap_version',rv.version_number,
    'roadmap_status',rv.status,
    'reveal_kind',rp.reveal_kind,
    'status',rp.status,
    'part_key',rpart.part_key,
    'production_order',rpart.production_order,
    'public_fields',rp.public_fields,
    'notes',rp.notes
  )
  into v_active_plan_json
  from genesis_private.roadmap_public_reveal_plan rp
  join genesis_private.roadmap_versions rv on rv.id=rp.roadmap_version_id
  join genesis_private.roadmap_parts rpart on rpart.id=rp.roadmap_part_id
  where rp.entity_id=p_entity_id
    and rv.status='ACTIVE'
    and rp.status='APPROVED'
  order by
    case when rp.reveal_kind='FIRST_PUBLIC' then 0 else 1 end,
    rpart.production_order,
    rp.created_at
  limit 1;

  select jsonb_build_object(
    'roadmap_version',rv.version_number,
    'roadmap_status',rv.status,
    'reveal_kind',rp.reveal_kind,
    'status',rp.status,
    'part_key',rpart.part_key,
    'production_order',rpart.production_order,
    'public_fields',rp.public_fields,
    'notes',rp.notes
  )
  into v_historical_plan_json
  from genesis_private.roadmap_public_reveal_plan rp
  join genesis_private.roadmap_versions rv on rv.id=rp.roadmap_version_id
  join genesis_private.roadmap_parts rpart on rpart.id=rp.roadmap_part_id
  where rp.entity_id=p_entity_id
    and rp.status='APPROVED'
  order by
    case when rv.status='ACTIVE' then 0 else 1 end,
    rv.version_number desc,
    case when rp.reveal_kind='FIRST_PUBLIC' then 0 else 1 end,
    rpart.production_order,
    rp.created_at
  limit 1;

  if v_projection_gate='RUMORED' and not v_first_public_executed then
    v_current_gate := 'RUMORED';
  elsif v_first_public_executed then
    if v_projection_gate in ('ENCOUNTERED','ANALYZED','MASTERED') then
      v_current_gate := v_projection_gate;
    else
      v_current_gate := 'DISCOVERED';
    end if;
  else
    v_current_gate := 'HIDDEN';
  end if;

  return jsonb_build_object(
    'contract_version','GENESIS-ATLAS-GATE-V1',
    'entity',jsonb_build_object(
      'id',v_entity_id,
      'code',v_entity_code,
      'type',v_entity_type,
      'canonical_name',v_canonical_name,
      'public_name',v_public_name,
      'entity_status',v_entity_status
    ),
    'current_gate',v_current_gate,
    'projection_gate',v_projection_gate,
    'first_public_executed',v_first_public_executed,
    'first_public',v_first_public_json,
    'active_reveal_plan',v_active_plan_json,
    'latest_approved_reveal_plan',v_historical_plan_json,
    'reader_fields',jsonb_build_object(
      'projection_safe_fields',v_projection_safe_fields,
      'executed_revealed_fields',v_revealed_fields,
      'hidden_fields',v_projection_hidden_fields
    ),
    'projection',jsonb_build_object(
      'website_status',v_projection_website_status,
      'reveal_requirements',v_projection_requirements,
      'updated_at',v_projection_updated_at
    ),
    'gates',jsonb_build_array(
      jsonb_build_object(
        'gate','HIDDEN','order',0,'reader_surface','NONE',
        'promotion_evidence','Default fail-closed state. No backend, art, roadmap, or private roster existence can publish the entity.',
        'automatic',true
      ),
      jsonb_build_object(
        'gate','RUMORED','order',1,'reader_surface','NAME_OR_TEASER_ONLY',
        'promotion_evidence','Requires explicit reader-safe rumor evidence. Never inferred from backend existence, art, spawn data, or private roadmap registration.',
        'automatic',false
      ),
      jsonb_build_object(
        'gate','DISCOVERED','order',2,'reader_surface','IDENTITY_PLUS_APPROVED_SAFE_FIELDS',
        'promotion_evidence','Requires FIRST_PUBLIC to be executed by a published Final Canon Part. Monster fields remain limited to the registered safe-field projection plus explicitly revealed fields.',
        'automatic',true
      ),
      jsonb_build_object(
        'gate','ENCOUNTERED','order',3,'reader_surface','DISCOVERED_PLUS_EXPLICIT_ENCOUNTER_FACTS',
        'promotion_evidence','Requires explicit published encounter evidence. Private monster roster, map assignment, spawn presence, or production planning do not qualify.',
        'automatic',false
      ),
      jsonb_build_object(
        'gate','ANALYZED','order',4,'reader_surface','ENCOUNTERED_PLUS_EXECUTED_ANALYSIS_FIELDS',
        'promotion_evidence','Requires explicit approved analysis evidence and executed field reveals. Only named revealed fields may be exposed; hidden-field denylist remains binding.',
        'automatic',false
      ),
      jsonb_build_object(
        'gate','MASTERED','order',5,'reader_surface','FULL_READER_SAFE_CODEX_WITHOUT_HIDDEN_FIELDS',
        'promotion_evidence','Requires an explicit canonical/admin mastery record. Never inferred from kill counts, asset approval, database completeness, or elapsed time.',
        'automatic',false
      )
    ),
    'safety',jsonb_build_object(
      'fail_closed',true,
      'art_never_promotes_gate',true,
      'backend_completeness_never_promotes_gate',true,
      'private_roadmap_never_promotes_gate',true,
      'hidden_fields_remain_hidden_at_mastered',true
    )
  );
end;
$function$;

revoke execute on function public.genesis_admin_atlas_gate_detail(text,uuid) from public, anon, authenticated;
grant execute on function public.genesis_admin_atlas_gate_detail(text,uuid) to service_role;
