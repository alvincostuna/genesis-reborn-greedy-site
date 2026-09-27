-- WEB MIGRATION 003: Reader EXP / Tier / collectible backend

create table if not exists public.reader_exp_ledger(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check(source_type in ('READ_PART','SHARE','SUPPORT','ADMIN','REVERSAL')),
  source_reference text not null,
  delta integer not null check(delta<>0),
  part_id uuid references public.story_parts(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source_type,source_reference)
);
alter table public.reader_exp_ledger enable row level security;
revoke all on public.reader_exp_ledger from anon,authenticated;
grant select on public.reader_exp_ledger to service_role;

create table if not exists public.reader_collectible_catalog(
  id uuid primary key default gen_random_uuid(),
  collectible_key text not null unique,
  title text not null,
  image_url text,
  asset_type text not null default 'PICTURE_CARD'
    check(asset_type in ('PICTURE_CARD','CHARACTER_PICTURE','MONSTER_PICTURE','DESKTOP_WALLPAPER','MOBILE_WALLPAPER','BACKGROUND','SPECIAL_ART')),
  preview_url text,
  download_url text,
  rarity text not null default 'COMMON' check(rarity in ('COMMON','UNCOMMON','RARE','EPIC','LEGENDARY')),
  min_episode integer not null default 0 check(min_episode>=0),
  downloadable boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.reader_collectible_catalog enable row level security;

create table if not exists public.reader_collectible_draws(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier_number integer not null check(tier_number>=2),
  collectible_id uuid not null references public.reader_collectible_catalog(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(user_id,tier_number)
);
alter table public.reader_collectible_draws enable row level security;

create table if not exists public.reader_collectible_inventory(
  user_id uuid not null references auth.users(id) on delete cascade,
  collectible_id uuid not null references public.reader_collectible_catalog(id) on delete restrict,
  quantity integer not null default 1 check(quantity>=1),
  first_obtained_at timestamptz not null default now(),
  last_obtained_at timestamptz not null default now(),
  primary key(user_id,collectible_id)
);
alter table public.reader_collectible_inventory enable row level security;

create table if not exists public.reader_profile_showcase(
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_no integer not null check(slot_no between 1 and 6),
  collectible_id uuid not null references public.reader_collectible_catalog(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key(user_id,slot_no)
);
alter table public.reader_profile_showcase enable row level security;

create or replace function public.reader_total_exp(p_user_id uuid)
returns bigint language sql stable security definer
set search_path='pg_catalog','public','pg_temp'
as $$ select coalesce(sum(delta),0)::bigint from public.reader_exp_ledger where user_id=p_user_id $$;

create or replace function public.reader_tier(p_user_id uuid)
returns integer language sql stable security definer
set search_path='pg_catalog','public','pg_temp'
as $ select floor(public.reader_total_exp(p_user_id)/1000.0)::integer+1 $;

create or replace function public.award_reader_exp_v1(
  p_user_id uuid,p_source_type text,p_source_reference text,p_delta integer,p_part_id uuid default null,p_metadata jsonb default '{}'::jsonb
) returns bigint
language plpgsql security definer
set search_path='pg_catalog','public','pg_temp'
as $$
declare v_total bigint;
begin
  if p_delta=0 then raise exception 'EXP_DELTA_ZERO'; end if;
  insert into public.reader_exp_ledger(user_id,source_type,source_reference,delta,part_id,metadata)
  values(p_user_id,p_source_type,p_source_reference,p_delta,p_part_id,coalesce(p_metadata,'{}'::jsonb))
  on conflict(source_type,source_reference) do nothing;
  select public.reader_total_exp(p_user_id) into v_total;
  return v_total;
end
$$;
revoke all on function public.award_reader_exp_v1(uuid,text,text,integer,uuid,jsonb) from public,anon,authenticated;

create or replace function public.reader_progress_exp_settle_v1()
returns trigger language plpgsql security definer
set search_path='pg_catalog','public','pg_temp'
as $$
begin
  if new.completed and (tg_op='INSERT' or not coalesce(old.completed,false)) then
    perform public.award_reader_exp_v1(
      new.user_id,'READ_PART','READ:'||new.user_id::text||':'||new.part_id::text,100,new.part_id,
      jsonb_build_object('progress_percent',new.progress_percent)
    );
  end if;
  return new;
end
$$;

drop trigger if exists trg_reader_progress_exp_settle_v1 on public.reader_progress;
create trigger trg_reader_progress_exp_settle_v1
after insert or update of completed on public.reader_progress
for each row execute function public.reader_progress_exp_settle_v1();

create or replace function public.support_exp_settle_v1()
returns trigger language plpgsql security definer
set search_path='pg_catalog','public','pg_temp'
as $$
declare v_exp integer;
begin
  if new.status='CONFIRMED' and (tg_op='INSERT' or old.status is distinct from 'CONFIRMED') then
    select coalesce(exp_reward,0) into v_exp from public.support_reward_rules where rule_key=new.rule_key;
    if coalesce(v_exp,0)>0 then
      perform public.award_reader_exp_v1(
        new.user_id,'SUPPORT','SUPPORT:'||new.id::text,v_exp,null,
        jsonb_build_object('rule_key',new.rule_key,'amount_php',new.amount_php)
      );
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists trg_support_exp_settle_v1 on public.support_transactions;
create trigger trg_support_exp_settle_v1
after insert or update of status on public.support_transactions
for each row execute function public.support_exp_settle_v1();

create or replace function public.share_reward_settle_v1()
returns trigger language plpgsql security definer
set search_path='pg_catalog','public','pg_temp'
as $$
declare v_week_count integer;
begin
  if new.status='VERIFIED' and (tg_op='INSERT' or old.status is distinct from 'VERIFIED') then
    select count(*) into v_week_count
    from public.share_reward_claims
    where user_id=new.user_id and status='VERIFIED'
      and claim_date>=date_trunc('week',new.claim_date::timestamp)::date
      and claim_date<date_trunc('week',new.claim_date::timestamp)::date+7;
    if v_week_count>5 then raise exception 'SHARE_WEEKLY_REWARD_LIMIT_REACHED'; end if;

    insert into public.advance_credit_ledger(user_id,source_type,source_reference,delta,note)
    values(new.user_id,'SHARE',new.id::text,1,'Verified share: +1 Part')
    on conflict(source_type,source_reference) do nothing;

    perform public.award_reader_exp_v1(
      new.user_id,'SHARE','SHARE:'||new.id::text,200,null,
      jsonb_build_object('platform',new.platform,'claim_date',new.claim_date)
    );
    update public.share_reward_claims set credits_awarded=1 where id=new.id and credits_awarded<>1;
  end if;
  return new;
end
$$;

drop trigger if exists trg_share_reward_settle_v1 on public.share_reward_claims;
create trigger trg_share_reward_settle_v1
after insert or update of status on public.share_reward_claims
for each row execute function public.share_reward_settle_v1();

create or replace function public.reader_draw_collectible_v1()
returns jsonb
language plpgsql security definer
set search_path='pg_catalog','public','auth','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_tier integer;
  v_next_tier integer;
  v_highest integer;
  v_collectible public.reader_collectible_catalog%rowtype;
begin
  if v_uid is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  v_tier:=public.reader_tier(v_uid);

  select coalesce(max(tier_number),1)+1 into v_next_tier
  from public.reader_collectible_draws where user_id=v_uid;

  if v_next_tier>v_tier then
    return jsonb_build_object('status','NO_DRAW_AVAILABLE','tier',v_tier,'next_draw_tier',v_next_tier);
  end if;

  select highest_episode_read into v_highest from public.reader_profiles where user_id=v_uid;
  v_highest:=coalesce(v_highest,0);

  select * into v_collectible
  from public.reader_collectible_catalog
  where active and min_episode<=v_highest
  order by random()
  limit 1;

  if not found then
    return jsonb_build_object('status','NO_ELIGIBLE_COLLECTIBLE','tier',v_tier);
  end if;

  insert into public.reader_collectible_draws(user_id,tier_number,collectible_id)
  values(v_uid,v_next_tier,v_collectible.id);

  insert into public.reader_collectible_inventory(user_id,collectible_id,quantity)
  values(v_uid,v_collectible.id,1)
  on conflict(user_id,collectible_id) do update
    set quantity=public.reader_collectible_inventory.quantity+1,last_obtained_at=now();

  return jsonb_build_object(
    'status','DRAWN','tier_number',v_next_tier,'collectible_key',v_collectible.collectible_key,
    'title',v_collectible.title,'rarity',v_collectible.rarity,'image_url',v_collectible.image_url,
    'asset_type',v_collectible.asset_type,'preview_url',v_collectible.preview_url,
    'download_url',v_collectible.download_url,'downloadable',v_collectible.downloadable
  );
end
$$;

create or replace function public.api_reader_account_v3()
returns jsonb
language plpgsql stable security definer
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
    insert into public.reader_profiles(user_id,display_name) values(v_uid,'Reader') returning * into v_profile;
  end if;

  v_total:=public.reader_total_exp(v_uid);
  v_tier:=public.reader_tier(v_uid);
  select count(*) into v_drawn from public.reader_collectible_draws where user_id=v_uid;
  select count(*) filter(where completed) into v_parts from public.reader_progress where user_id=v_uid;
  select count(distinct e.id)
  into v_eps
  from public.episodes e
  where exists(
    select 1 from public.story_parts sp
    where sp.episode_id=e.id
  )
  and not exists(
    select 1 from public.story_parts sp
    where sp.episode_id=e.id
      and not exists(
        select 1 from public.reader_progress rp
        where rp.user_id=v_uid and rp.part_id=sp.id and rp.completed
      )
  );
  select coalesce(sum(quantity),0)::integer into v_collection from public.reader_collectible_inventory where user_id=v_uid;

  return jsonb_build_object(
    'contract_version','GENESIS-READER-V3',
    'user_id',v_uid,'display_name',v_profile.display_name,
    'created_at',v_profile.created_at,
    'highest_episode_read',v_profile.highest_episode_read,
    'highest_part_key',v_profile.highest_part_key,
    'latest_read_label',case when v_profile.highest_episode_read>0 then
      'Episode '||lpad(v_profile.highest_episode_read::text,3,'0')||
      case when v_profile.highest_part_key is not null then ' — '||v_profile.highest_part_key else '' end
      else 'Not started' end,
    'total_exp',v_total,'reader_exp',v_total,'tier',v_tier,
    'tier_exp_threshold',1000,
    'exp_into_tier',(v_total % 1000),
    'exp_to_next_tier',(1000-(v_total % 1000)),
    'pending_reward_draws',greatest(v_tier-1-coalesce(v_drawn,0),0),
    'parts_read',coalesce(v_parts,0),'episodes_completed',coalesce(v_eps,0),
    'collection_count',coalesce(v_collection,0),
    'support',public.api_reader_support_status()
  );
end
$$;

grant execute on function public.reader_total_exp(uuid) to service_role;
grant execute on function public.reader_tier(uuid) to service_role;
revoke all on function public.reader_draw_collectible_v1() from public;
grant execute on function public.reader_draw_collectible_v1() to authenticated;
revoke all on function public.api_reader_account_v3() from public;
grant execute on function public.api_reader_account_v3() to authenticated,service_role;

create or replace function public.api_reader_collectibles_v1()
returns jsonb
language sql stable security definer
set search_path='pg_catalog','public','auth','pg_temp'
as $
  with me as (
    select auth.uid() as user_id
  ),
  progress as (
    select coalesce(rp.highest_episode_read,0) as highest_episode_read
    from me
    left join public.reader_profiles rp on rp.user_id=me.user_id
  ),
  rewards as (
    select
      c.collectible_key,
      c.title,
      c.asset_type,
      c.rarity,
      c.image_url,
      c.preview_url,
      c.download_url,
      c.downloadable,
      c.min_episode,
      coalesce(i.quantity,0)::integer as quantity,
      (coalesce(i.quantity,0)>0) as owned,
      (c.min_episode<=coalesce((select highest_episode_read from progress),0)) as eligible
    from public.reader_collectible_catalog c
    cross join me
    left join public.reader_collectible_inventory i
      on i.user_id=me.user_id and i.collectible_id=c.id
    where c.active
    order by
      case c.rarity
        when 'LEGENDARY' then 5
        when 'EPIC' then 4
        when 'RARE' then 3
        when 'UNCOMMON' then 2
        else 1
      end desc,
      c.created_at asc
  )
  select case
    when (select user_id from me) is null then
      jsonb_build_object('status','AUTHENTICATION_REQUIRED','items','[]'::jsonb)
    else
      jsonb_build_object(
        'status','OK',
        'items',coalesce(jsonb_agg(to_jsonb(rewards)),'[]'::jsonb)
      )
  end
  from rewards
$;

revoke all on function public.api_reader_collectibles_v1() from public;
grant execute on function public.api_reader_collectibles_v1() to authenticated,service_role;

