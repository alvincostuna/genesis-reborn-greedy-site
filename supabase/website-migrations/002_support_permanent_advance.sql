-- WEB MIGRATION 002: ₱9/₱49/₱189 support + permanent advance access
-- Apply only while payments/share rewards remain disabled.

do $$
begin
  if exists(select 1 from public.support_settings where id=1 and (payments_enabled or share_rewards_enabled)) then
    raise exception 'WEB_M002_REQUIRES_PAYMENTS_AND_SHARE_REWARDS_DISABLED';
  end if;
end $$;

alter table public.support_reward_rules
  add column if not exists exp_reward integer not null default 0 check (exp_reward>=0);

update public.support_reward_rules
set active=false
where rule_key in ('SUPPORT_10','SUPPORT_50','VIP_200');

insert into public.support_reward_rules(
  rule_key,label,amount_php,reward_kind,advance_credits,horizon_days,horizon_parts,
  counts_toward_rewarded_paid_cap,no_return_expected,active,sort_order,exp_reward
) values
('SUPPORT_9','Support ₱9',9,'ADVANCE_CREDIT',2,1,2,true,false,true,10,100),
('SUPPORT_49','Support ₱49',49,'ADVANCE_CREDIT',14,7,14,true,false,true,20,500),
('SUPPORT_189','Support ₱189',189,'ADVANCE_CREDIT',60,30,60,true,false,true,30,2000)
on conflict(rule_key) do update set
  label=excluded.label,amount_php=excluded.amount_php,reward_kind=excluded.reward_kind,
  advance_credits=excluded.advance_credits,horizon_days=excluded.horizon_days,
  horizon_parts=excluded.horizon_parts,counts_toward_rewarded_paid_cap=excluded.counts_toward_rewarded_paid_cap,
  no_return_expected=excluded.no_return_expected,active=excluded.active,sort_order=excluded.sort_order,
  exp_reward=excluded.exp_reward;

update public.support_reward_rules
set label='Verified Share',reward_kind='SHARE_CREDIT',advance_credits=1,
    horizon_days=null,horizon_parts=null,exp_reward=200,active=true
where rule_key='VERIFIED_SHARE';

update genesis_private.payment_provider_settings
set test_allowed_rule_keys='["SUPPORT_9"]'::jsonb,
    updated_at=now()
where provider='PAYMONGO' and provider_enabled=false;

create or replace function public.api_support_catalog_v4()
returns jsonb
language sql
stable
security definer
set search_path='pg_catalog','public','genesis_private','pg_temp'
as $$
select jsonb_build_object(
  'contract_version','GENESIS-SUPPORT-V4',
  'settings',jsonb_build_object(
    'currency',s.currency,
    'share_daily_limit',s.share_daily_limit,
    'share_weekly_limit',s.share_weekly_limit,
    'payments_enabled',s.payments_enabled,
    'share_rewards_enabled',s.share_rewards_enabled,
    'pure_support_enabled',s.pure_support_enabled,
    'payment_provider','PAYMONGO',
    'payment_provider_enabled',p.provider_enabled,
    'payment_provider_mode',p.mode
  ),
  'rules',coalesce((
    select jsonb_agg(jsonb_build_object(
      'rule_key',r.rule_key,'label',r.label,'amount_php',r.amount_php,
      'advance_parts',r.advance_credits,'exp_reward',r.exp_reward,
      'horizon_days',r.horizon_days,'horizon_parts',r.horizon_parts,
      'no_return_expected',r.no_return_expected
    ) order by r.sort_order)
    from public.support_reward_rules r where r.active
  ),'[]'::jsonb)
)
from public.support_settings s
cross join genesis_private.payment_provider_settings p
where s.id=1 and p.provider='PAYMONGO'
$$;

create or replace function public.reader_can_access_part_v2(p_user_id uuid,p_part_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path='pg_catalog','public','auth','pg_temp'
as $$
declare v_state text; v_publish timestamptz;
begin
  select publication_status,publish_at into v_state,v_publish
  from public.story_parts where id=p_part_id and canon_status='final';
  if not found then return false; end if;

  if v_state='published' and v_publish is not null and v_publish<=now() then return true; end if;
  if p_user_id is null then return false; end if;

  return exists(
    select 1 from public.advance_part_access a
    where a.user_id=p_user_id and a.part_id=p_part_id and a.revoked_at is null
  );
end
$$;

create or replace function public.reader_unlock_next_advance_part_v2()
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','auth','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_balance bigint;
  v_series uuid;
  v_public_ord bigint;
  v_next public.story_part_release_order%rowtype;
  v_ref text;
begin
  if v_uid is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  select coalesce(sum(delta),0) into v_balance from public.advance_credit_ledger where user_id=v_uid;
  if v_balance<1 then raise exception 'NO_ADVANCE_CREDITS' using errcode='55000'; end if;

  select id into v_series from public.series where slug='genesis-reborn-greedy' limit 1;
  if v_series is null then raise exception 'GENESIS_SERIES_NOT_FOUND' using errcode='P0002'; end if;

  select coalesce(max(story_ordinal),0) into v_public_ord
  from public.story_part_release_order
  where series_id=v_series and publication_status='published' and publish_at<=now();

  select o.* into v_next
  from public.story_part_release_order o
  where o.series_id=v_series
    and o.story_ordinal>v_public_ord
    and o.canon_status='final'
    and o.publication_status='scheduled'
    and o.publish_at is not null
    and not exists(
      select 1 from public.advance_part_access a
      where a.user_id=v_uid and a.part_id=o.part_id and a.revoked_at is null
    )
  order by o.story_ordinal
  limit 1;

  if v_next.part_id is null then
    return jsonb_build_object('status','WAITING_FOR_VERIFIED_SCHEDULED_PART','credit_balance',v_balance);
  end if;

  v_ref:='UNLOCK:'||v_uid::text||':'||v_next.part_id::text;
  insert into public.advance_part_access(user_id,part_id,source_type,source_reference)
  values(v_uid,v_next.part_id,'CREDIT',v_ref)
  on conflict(user_id,part_id) do nothing;

  insert into public.advance_credit_ledger(user_id,source_type,source_reference,delta,part_id,note)
  values(v_uid,'SPEND',v_ref,-1,v_next.part_id,'Permanent advance Part unlock')
  on conflict(source_type,source_reference) do nothing;

  return jsonb_build_object(
    'status','UNLOCKED','part_id',v_next.part_id,'part_key',v_next.part_key,
    'story_ordinal',v_next.story_ordinal,'credit_balance_after',v_balance-1
  );
end
$$;

create or replace function public.api_episode_parts_for_reader_v3(p_episode_number integer)
returns table(
  contract_version text,part_id uuid,episode_number integer,episode_slug text,episode_title text,
  saga_number integer,saga_title text,part_number integer,part_key text,slug text,title text,
  body_html text,body_text text,word_count integer,publish_at timestamptz,published_at timestamptz,access_mode text
)
language sql
stable
security definer
set search_path='pg_catalog','public','auth','pg_temp'
as $$
select
  'GENESIS-READER-V3'::text,sp.id,e.episode_number,e.slug,e.title,s.saga_number,s.title,
  sp.part_number,sp.part_key,sp.slug,sp.title,sp.body_html,sp.body_text,sp.word_count,sp.publish_at,sp.published_at,
  case when sp.publication_status='published' and sp.publish_at<=now() then 'PUBLIC' else 'ADVANCE' end
from public.story_parts sp
join public.episodes e on e.id=sp.episode_id
join public.sagas s on s.id=e.saga_id
where e.episode_number=p_episode_number
  and sp.canon_status='final'
  and public.reader_can_access_part_v2(auth.uid(),sp.id)
order by sp.part_number
$$;

revoke all on function public.api_support_catalog_v4() from public;
grant execute on function public.api_support_catalog_v4() to anon,authenticated,service_role;
revoke all on function public.reader_can_access_part_v2(uuid,uuid) from public;
grant execute on function public.reader_can_access_part_v2(uuid,uuid) to service_role;
revoke all on function public.reader_unlock_next_advance_part_v2() from public;
grant execute on function public.reader_unlock_next_advance_part_v2() to authenticated;
revoke all on function public.api_episode_parts_for_reader_v3(integer) from public;
grant execute on function public.api_episode_parts_for_reader_v3(integer) to anon,authenticated,service_role;
