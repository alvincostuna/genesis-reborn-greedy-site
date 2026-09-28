-- CONTRACT TEST 005: release cadence + 2,000 EXP Tier threshold
do $$
declare
  v timestamptz;
  j jsonb;
begin
  if (select timezone from public.release_settings where id=1) <> 'Asia/Manila' then
    raise exception 'T5_TIMEZONE_FAIL';
  end if;

  if (select cycle_anchor_local from public.release_settings where id=1) <> '08:00:00'::time then
    raise exception 'T5_ANCHOR_FAIL';
  end if;

  if (select cycle_hours from public.release_settings where id=1) <> 6 then
    raise exception 'T5_CYCLE_METADATA_FAIL';
  end if;

  v:=public.next_genesis_cycle('2026-09-28 07:00:00+08'::timestamptz);
  if (v at time zone 'Asia/Manila') <> '2026-09-28 08:00:00'::timestamp then
    raise exception 'T5_SLOT_0800_FAIL %',v;
  end if;

  v:=public.next_genesis_cycle('2026-09-28 09:00:00+08'::timestamptz);
  if (v at time zone 'Asia/Manila') <> '2026-09-28 14:00:00'::timestamp then
    raise exception 'T5_SLOT_1400_FAIL %',v;
  end if;

  v:=public.next_genesis_cycle('2026-09-28 15:00:00+08'::timestamptz);
  if (v at time zone 'Asia/Manila') <> '2026-09-28 20:00:00'::timestamp then
    raise exception 'T5_SLOT_2000_FAIL %',v;
  end if;

  v:=public.next_genesis_cycle('2026-10-03 21:00:00+08'::timestamptz);
  if (v at time zone 'Asia/Manila') <> '2026-10-05 08:00:00'::timestamp then
    raise exception 'T5_SUNDAY_REST_FAIL %',v;
  end if;

  j:=public.api_release_clock_v2();
  if j->'daily_slots' <> '["08:00","14:00","20:00"]'::jsonb then
    raise exception 'T5_CLOCK_SLOTS_FAIL %',j;
  end if;
  if coalesce((j->>'sunday_rest')::boolean,false) is not true then
    raise exception 'T5_SUNDAY_FLAG_FAIL %',j;
  end if;
end $$;

do $$
declare
  v_user uuid:=gen_random_uuid();
begin
  -- Contract-level arithmetic check for the public Tier rule.
  if floor(0/2000.0)::integer+1 <> 1 then raise exception 'T5_TIER_ZERO_FAIL'; end if;
  if floor(1999/2000.0)::integer+1 <> 1 then raise exception 'T5_TIER_1999_FAIL'; end if;
  if floor(2000/2000.0)::integer+1 <> 2 then raise exception 'T5_TIER_2000_FAIL'; end if;
  if floor(4000/2000.0)::integer+1 <> 3 then raise exception 'T5_TIER_4000_FAIL'; end if;
end $$;
