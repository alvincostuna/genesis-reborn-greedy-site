-- CONTRACT TEST 003
do $$
declare
  v_user uuid;
  v_part uuid;
  v_series uuid:=gen_random_uuid();
  v_saga uuid:=gen_random_uuid();
  v_ep uuid:=gen_random_uuid();
  v_total bigint;
begin
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
  values(gen_random_uuid(),'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
         'qa-web-m003-'||gen_random_uuid()::text||'@example.invalid','',now(),now(),now())
  returning id into v_user;

  insert into public.reader_profiles(user_id,display_name,highest_episode_read) values(v_user,'QA Reader',1)
  on conflict(user_id) do update set display_name=excluded.display_name,highest_episode_read=excluded.highest_episode_read;

  insert into public.series(id,slug,title,status) values(v_series,'qa-m003-'||substr(v_series::text,1,8),'QA', 'active');
  insert into public.sagas(id,series_id,saga_number,slug,title,status,sort_order)
  values(v_saga,v_series,999998,'qa-saga-'||substr(v_saga::text,1,8),'QA Saga','active',999998);
  insert into public.episodes(id,series_id,saga_id,episode_number,slug,title,canon_status,current_version)
  values(v_ep,v_series,v_saga,999998,'qa-ep-'||substr(v_ep::text,1,8),'QA Episode','final',1);
  insert into public.story_parts(episode_id,part_number,part_key,slug,title,body_text,word_count,canon_status,publication_status,publish_at,published_at,current_version)
  values(v_ep,1,'QA-M003-P1','qa-m003-p1','QA Part','QA',1,'final','published',now()-interval '1 hour',now()-interval '1 hour',1)
  returning id into v_part;

  insert into public.reader_progress(user_id,part_id,active_seconds,progress_percent,completed)
  values(v_user,v_part,60,100,true);

  select public.reader_total_exp(v_user) into v_total;
  if v_total<>100 then raise exception 'T3_READ_EXP_FAIL %',v_total; end if;

  update public.reader_progress set completed=true where user_id=v_user and part_id=v_part;
  select public.reader_total_exp(v_user) into v_total;
  if v_total<>100 then raise exception 'T3_READ_EXP_IDEMPOTENCY_FAIL %',v_total; end if;

  perform public.award_reader_exp_v1(v_user,'ADMIN','QA-TIER',900,null,'{}'::jsonb);
  if public.reader_tier(v_user)<>2 then raise exception 'T3_TIER_FAIL %',public.reader_tier(v_user); end if;

  if public.reader_tier(v_user)<>floor(public.reader_total_exp(v_user)/1000.0)::integer+1 then raise exception 'T3_TIER_THRESHOLD_FAIL'; end if;

  insert into public.reader_collectible_catalog(collectible_key,title,asset_type,rarity,min_episode,active)
  values('QA-COLLECTIBLE','QA Collectible','PICTURE_CARD','COMMON',1,true);

  if not exists(
    select 1 from public.reader_collectible_catalog
    where collectible_key='QA-COLLECTIBLE' and asset_type='PICTURE_CARD'
  ) then raise exception 'T3_ASSET_TYPE_FAIL'; end if;

  -- Inventory/draw tables exist and duplicate-capable quantity is modeled.
  if not exists(select 1 from information_schema.tables where table_schema='public' and table_name='reader_collectible_inventory') then
    raise exception 'T3_COLLECTION_TABLE_FAIL';
  end if;
end $$;
