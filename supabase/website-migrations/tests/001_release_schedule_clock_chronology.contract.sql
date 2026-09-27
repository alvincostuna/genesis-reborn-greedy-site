-- CONTRACT TEST 001
do $$
declare
  v timestamptz;
  j jsonb;
begin
  if (select cycle_anchor_local from public.release_settings where id=1) <> '08:00:00'::time then
    raise exception 'T1_ANCHOR_FAIL';
  end if;
  if (select cycle_hours from public.release_settings where id=1) <> 12 then
    raise exception 'T1_CYCLE_FAIL';
  end if;
  v:=public.next_genesis_cycle('2026-09-27 07:00:00+08'::timestamptz);
  if (v at time zone 'Asia/Manila')::time <> '08:00:00'::time then
    raise exception 'T1_NEXT_08_FAIL %',v;
  end if;
  v:=public.next_genesis_cycle('2026-09-27 09:00:00+08'::timestamptz);
  if (v at time zone 'Asia/Manila')::time <> '20:00:00'::time then
    raise exception 'T1_NEXT_20_FAIL %',v;
  end if;
  j:=public.api_release_clock_v2();
  if j->>'contract_version' <> 'GENESIS-PUBLIC-API-V2' then raise exception 'T1_CLOCK_VERSION_FAIL'; end if;
  if j->'daily_slots' <> '["08:00","20:00"]'::jsonb then raise exception 'T1_SLOTS_FAIL %',j; end if;
end $$;

-- Public historical library visibility must not depend on releases_paused.
do $$
declare
  v_series uuid:=gen_random_uuid();
  v_saga uuid:=gen_random_uuid();
  v_ep uuid:=gen_random_uuid();
  v_part uuid:=gen_random_uuid();
  c integer;
begin
  insert into public.series(id,slug,title,status) values(v_series,'qa-web-m001-'||substr(v_series::text,1,8),'QA', 'active');
  insert into public.sagas(id,series_id,saga_number,slug,title,status,sort_order)
  values(v_saga,v_series,999999,'qa-saga-'||substr(v_saga::text,1,8),'QA Saga','active',999999);
  insert into public.episodes(id,series_id,saga_id,episode_number,slug,title,canon_status,current_version)
  values(v_ep,v_series,v_saga,999999,'qa-episode-'||substr(v_ep::text,1,8),'QA Episode','final',1);
  insert into public.story_parts(id,episode_id,part_number,part_key,slug,title,body_text,word_count,canon_status,publication_status,publish_at,published_at,current_version)
  values(v_part,v_ep,1,'QA-M001-'||v_part::text,'qa-part-'||substr(v_part::text,1,8),'QA Part','QA',1,'final','published',now()-interval '1 hour',now()-interval '1 hour',1);
  select count(*) into c from public.api_episode_library_v2() x where x.episode_number=999999;
  if c<>1 then raise exception 'T1_PAUSED_LIBRARY_VISIBILITY_FAIL'; end if;
end $$;
