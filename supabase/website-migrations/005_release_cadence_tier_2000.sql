-- WEB MIGRATION 005: Public release cadence + reader Tier/reward threshold
-- Website/public-release configuration only.
-- Release days: Monday-Saturday. Sunday is a rest day.
-- Slots: 08:00, 14:00, 20:00 Asia/Manila.
-- Reader Tier + collectible draw: every 2,000 EXP.

update public.release_settings
set timezone='Asia/Manila',
    cycle_anchor_local='08:00:00'::time,
    cycle_hours=6,
    updated_at=now()
where id=1;

create or replace function public.next_genesis_cycle(p_after timestamptz default now())
returns timestamptz
language plpgsql
stable
set search_path='public','pg_temp'
as $$
declare
  v_timezone text;
  local_after timestamp;
  candidate_local timestamp;
  d date;
  slot_hour integer;
  slots integer[]:=array[8,14,20];
  day_offset integer;
begin
  select timezone into v_timezone
  from public.release_settings
  where id=1;

  local_after:=p_after at time zone v_timezone;

  for day_offset in 0..7 loop
    d:=local_after::date + day_offset;

    -- Sunday (DOW 0) is a rest day.
    if extract(dow from d)=0 then
      continue;
    end if;

    foreach slot_hour in array slots loop
      candidate_local:=d::timestamp + make_interval(hours=>slot_hour);
      if candidate_local>local_after then
        return candidate_local at time zone v_timezone;
      end if;
    end loop;
  end loop;

  raise exception 'NO_RELEASE_SLOT_FOUND';
end
$$;

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
    'daily_slots',jsonb_build_array('08:00','14:00','20:00'),
    'release_days',jsonb_build_array('MON','TUE','WED','THU','FRI','SAT'),
    'sunday_rest',true,
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
  from public.release_settings rs
  where rs.id=1
$$;

create or replace function public.reader_tier(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path='pg_catalog','public','pg_temp'
as $$
  select floor(public.reader_total_exp(p_user_id)/2000.0)::integer+1
$$;

create or replace function public.api_reader_account_v3()
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','auth','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_profile public.reader_profiles%rowtype;
  v_total bigint;
  v_tier integer;
  v_drawn integer;
  v_parts integer;
  v_eps integer;
  v_collection integer;
begin
  if v_uid is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;

  select * into v_profile from public.reader_profiles where user_id=v_uid;
  if not found then
    insert into public.reader_profiles(user_id,display_name)
    values(v_uid,'Reader')
    returning * into v_profile;
  end if;

  v_total:=public.reader_total_exp(v_uid);
  v_tier:=public.reader_tier(v_uid);
  select count(*) into v_drawn from public.reader_collectible_draws where user_id=v_uid;
  select count(*) filter(where completed) into v_parts from public.reader_progress where user_id=v_uid;

  select count(distinct e.id)
  into v_eps
  from public.episodes e
  where exists(select 1 from public.story_parts sp where sp.episode_id=e.id)
    and not exists(
      select 1 from public.story_parts sp
      where sp.episode_id=e.id
        and not exists(
          select 1 from public.reader_progress rp
          where rp.user_id=v_uid and rp.part_id=sp.id and rp.completed
        )
    );

  select coalesce(sum(quantity),0)::integer
  into v_collection
  from public.reader_collectible_inventory
  where user_id=v_uid;

  return jsonb_build_object(
    'contract_version','GENESIS-READER-V3',
    'user_id',v_uid,
    'display_name',v_profile.display_name,
    'created_at',v_profile.created_at,
    'highest_episode_read',v_profile.highest_episode_read,
    'highest_part_key',v_profile.highest_part_key,
    'latest_read_label',case
      when v_profile.highest_episode_read>0 then
        'Episode '||lpad(v_profile.highest_episode_read::text,3,'0')||
        case when v_profile.highest_part_key is not null then ' — '||v_profile.highest_part_key else '' end
      else 'Not started'
    end,
    'total_exp',v_total,
    'reader_exp',v_total,
    'tier',v_tier,
    'tier_exp_threshold',2000,
    'exp_into_tier',(v_total % 2000),
    'exp_to_next_tier',(2000-(v_total % 2000)),
    'pending_reward_draws',greatest(v_tier-1-coalesce(v_drawn,0),0),
    'parts_read',coalesce(v_parts,0),
    'episodes_completed',coalesce(v_eps,0),
    'collection_count',coalesce(v_collection,0),
    'support',public.api_reader_support_status()
  );
end
$$;

revoke all on function public.api_release_clock_v2() from public;
grant execute on function public.api_release_clock_v2() to anon,authenticated,service_role;
grant execute on function public.reader_tier(uuid) to service_role;
revoke all on function public.api_reader_account_v3() from public;
grant execute on function public.api_reader_account_v3() to authenticated,service_role;
