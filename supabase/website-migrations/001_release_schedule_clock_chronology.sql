-- WEB MIGRATION 001: Release schedule / clock / chronology
-- Prepared for WEB-RULES-V1. Apply only while releases_paused=true and launch_authorized=false.

do $$
begin
  if not exists (
    select 1 from public.release_settings
    where id=1 and releases_paused=true and launch_authorized=false
  ) then
    raise exception 'WEB_M001_REQUIRES_PAUSED_UNAUTHORIZED_RELEASE_STATE';
  end if;
end $$;

update public.release_settings
set timezone='Asia/Manila',
    cycle_anchor_local='08:00:00'::time,
    cycle_hours=12,
    updated_at=now()
where id=1;

create or replace function public.api_release_clock_v2()
returns jsonb
language sql
stable
security definer
set search_path='pg_catalog','genesis_private','public','pg_temp'
as $$
  select jsonb_build_object(
    'contract_version','GENESIS-PUBLIC-API-V2',
    'timezone',rs.timezone,
    'daily_slots',jsonb_build_array('08:00','20:00'),
    'next_publish_at',(
      select min(ri.publish_at)
      from genesis_private.release_items ri
      join genesis_private.production_parts pp on pp.id=ri.production_part_id
      join genesis_private.production_batches pb on pb.id=pp.batch_id
      join genesis_private.roadmap_versions rv on rv.id=pb.roadmap_version_id
      where ri.release_status='SCHEDULED'
        and ri.publish_at is not null
        and ri.publish_at>now()
        and pp.production_state='FINAL_CANON'
        and pp.final_canon_version_id=ri.final_canon_version_id
        and rv.status='ACTIVE'
        and rv.source_system='SUPABASE'
    ),
    'next_cycle_at',public.next_genesis_cycle(now()),
    'released_parts',(
      select count(*) from public.story_parts sp
      where sp.canon_status='final'
        and sp.publication_status='published'
        and sp.publish_at is not null
        and sp.publish_at<=now()
    ),
    'releases_paused',rs.releases_paused,
    'launch_authorized',rs.launch_authorized
  )
  from public.release_settings rs where rs.id=1
$$;

create or replace function public.api_episode_library_v2()
returns table(
  contract_version text,
  episode_number integer,
  slug text,
  title text,
  summary_public text,
  saga_number integer,
  saga_title text,
  released_parts integer,
  latest_released_part integer,
  latest_release_at timestamptz
)
language sql
stable
security definer
set search_path='pg_catalog','public','pg_temp'
as $$
  select
    'GENESIS-PUBLIC-API-V2'::text,
    e.episode_number,e.slug,e.title,e.summary_public,
    s.saga_number,s.title,
    count(sp.id)::integer,
    max(sp.part_number)::integer,
    max(sp.publish_at)
  from public.episodes e
  join public.sagas s on s.id=e.saga_id
  join public.story_parts sp on sp.episode_id=e.id
  where sp.canon_status='final'
    and sp.publication_status='published'
    and sp.publish_at is not null
    and sp.publish_at<=now()
  group by e.id,e.episode_number,e.slug,e.title,e.summary_public,s.saga_number,s.title
  order by e.episode_number
$$;

create or replace function genesis_private.process_due_releases_v2(
  p_actor text default 'SYSTEM'
) returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','genesis_private','public','pg_temp'
as $$
declare
  v_paused boolean;
  v_item uuid;
  v_result jsonb;
begin
  select releases_paused into v_paused from public.release_settings where id=1;
  if coalesce(v_paused,true) then
    return jsonb_build_object('status','PAUSED','published',0,'failed',0);
  end if;

  select ri.id into v_item
  from genesis_private.release_items ri
  join genesis_private.production_parts pp on pp.id=ri.production_part_id
  join genesis_private.production_batches pb on pb.id=pp.batch_id
  join genesis_private.roadmap_versions rv on rv.id=pb.roadmap_version_id
  where ri.release_status='SCHEDULED'
    and ri.publish_at is not null
    and ri.publish_at<=now()
    and rv.status='ACTIVE'
    and rv.source_system='SUPABASE'
  order by pp.episode_number,pp.part_number,ri.publish_at,ri.id
  for update of ri skip locked
  limit 1;

  if v_item is null then
    return jsonb_build_object('status','NO_DUE_RELEASE','published',0,'failed',0);
  end if;

  perform genesis_private.assert_release_order_v1(v_item,'PUBLISH');

  begin
    v_result:=genesis_private.publish_release_item(v_item,p_actor);
    return jsonb_build_object('status','COMPLETE','published',1,'failed',0,'result',v_result);
  exception when others then
    insert into genesis_private.release_events(release_item_id,event_type,actor,reason,payload)
    values(v_item,'PUBLISH_FAILED',p_actor,sqlerrm,jsonb_build_object('sqlstate',sqlstate));
    return jsonb_build_object('status','BLOCKED','published',0,'failed',1,'release_item_id',v_item,'error',sqlerrm);
  end;
end
$$;

revoke all on function public.api_release_clock_v2() from public;
grant execute on function public.api_release_clock_v2() to anon,authenticated,service_role;
revoke all on function public.api_episode_library_v2() from public;
grant execute on function public.api_episode_library_v2() to anon,authenticated,service_role;
revoke all on function genesis_private.process_due_releases_v2(text) from public,anon,authenticated;
grant execute on function genesis_private.process_due_releases_v2(text) to service_role;
