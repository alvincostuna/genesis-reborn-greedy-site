-- GENESIS Reader Atlas V1
-- Supabase-driven, fail-closed reader Atlas/search contracts.
-- Private map/spawn/NPC/shop tables may be queried only inside SECURITY DEFINER
-- functions; only entities with executed published Final Canon FIRST_PUBLIC are returned.

create or replace function public.api_entity_search_v2(
  p_type text default null,
  p_query text default null,
  p_limit integer default 50
)
returns table(
  contract_version text,
  entity_code text,
  entity_type text,
  slug text,
  public_name text,
  short_description text,
  revealed_fields jsonb
)
language sql
stable
security definer
set search_path='pg_catalog','public','pg_temp'
as $function$
  select
    'GENESIS-PUBLIC-ENTITY-SEARCH-V2'::text,
    ge.entity_code,
    ge.entity_type,
    ge.slug,
    ge.public_name,
    ge.short_description,
    coalesce((
      select jsonb_object_agg(er.field_key,er.value_json order by er.reveal_order)
      from public.entity_reveals er
      join public.story_parts rsp on rsp.id=er.reveal_part_id
      where er.entity_id=ge.id
        and rsp.canon_status='final'
        and rsp.publication_status='published'
        and rsp.publish_at is not null
        and rsp.publish_at<=now()
    ),'{}'::jsonb)
  from public.game_entities ge
  join public.story_parts first_sp on first_sp.id=ge.first_public_part_id
  where ge.status='active'
    and first_sp.canon_status='final'
    and first_sp.publication_status='published'
    and first_sp.publish_at is not null
    and first_sp.publish_at<=now()
    and (
      p_type is null or btrim(p_type)='' or lower(btrim(p_type))='all'
      or ge.entity_type=lower(btrim(p_type))
    )
    and (
      p_query is null or btrim(p_query)=''
      or ge.public_name ilike '%'||btrim(p_query)||'%'
      or ge.entity_code ilike '%'||btrim(p_query)||'%'
    )
  order by ge.public_name
  limit greatest(1,least(coalesce(p_limit,50),100));
$function$;

revoke execute on function public.api_entity_search_v2(text,text,integer) from public;
grant execute on function public.api_entity_search_v2(text,text,integer) to anon,authenticated,service_role;

create or replace function public.api_atlas_map_index_v1(
  p_query text default null,
  p_limit integer default 100
)
returns jsonb
language sql
stable
security definer
set search_path='pg_catalog','genesis_private','public','pg_temp'
as $function$
  with revealed_maps as (
    select
      ge.id,
      ge.entity_code,
      ge.slug,
      ge.public_name,
      ge.short_description,
      coalesce((
        select jsonb_object_agg(er.field_key,er.value_json order by er.reveal_order)
        from public.entity_reveals er
        join public.story_parts rsp on rsp.id=er.reveal_part_id
        where er.entity_id=ge.id
          and rsp.canon_status='final'
          and rsp.publication_status='published'
          and rsp.publish_at is not null
          and rsp.publish_at<=now()
      ),'{}'::jsonb) as revealed_fields
    from public.game_entities ge
    join genesis_private.map_master mm on mm.entity_id=ge.id
    join public.story_parts first_sp on first_sp.id=ge.first_public_part_id
    where ge.entity_type='map'
      and ge.status='active'
      and first_sp.canon_status='final'
      and first_sp.publication_status='published'
      and first_sp.publish_at is not null
      and first_sp.publish_at<=now()
      and (
        p_query is null or btrim(p_query)=''
        or ge.public_name ilike '%'||btrim(p_query)||'%'
        or ge.entity_code ilike '%'||btrim(p_query)||'%'
      )
    order by ge.public_name
    limit greatest(1,least(coalesce(p_limit,100),100))
  ),
  rows as (
    select jsonb_agg(
      jsonb_build_object(
        'entity_code',rm.entity_code,
        'slug',rm.slug,
        'public_name',rm.public_name,
        'short_description',rm.short_description,
        'reveal_state','DISCOVERED',
        'region',coalesce(nullif(rm.revealed_fields->>'region',''),'Discovered World'),
        'map_type',coalesce(nullif(rm.revealed_fields->>'map_type',''),'MAP'),
        'revealed_fields',rm.revealed_fields,
        'art',jsonb_build_object(
          'status','PLACEHOLDER',
          'url',null,
          'reason','No approved reader-safe Atlas artwork is bound yet.'
        ),
        'href','/world/map/?slug='||rm.slug
      )
      order by rm.public_name
    ) as items
    from revealed_maps rm
  )
  select jsonb_build_object(
    'contract_version','GENESIS-READER-ATLAS-INDEX-V1',
    'fog_policy','FAIL_CLOSED',
    'maps',coalesce(rows.items,'[]'::jsonb),
    'reader_safe_count',jsonb_array_length(coalesce(rows.items,'[]'::jsonb)),
    'fog_state',case
      when jsonb_array_length(coalesce(rows.items,'[]'::jsonb))=0 then 'FULL_FOG'
      else 'PARTIAL_FOG'
    end
  )
  from rows;
$function$;

revoke execute on function public.api_atlas_map_index_v1(text,integer) from public;
grant execute on function public.api_atlas_map_index_v1(text,integer) to anon,authenticated,service_role;

create or replace function public.api_atlas_map_detail_v1(
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog','genesis_private','public','pg_temp'
as $function$
declare
  v_map_id uuid;
  v_code text;
  v_slug text;
  v_name text;
  v_desc text;
  v_fields jsonb := '{}'::jsonb;
  v_allow_connections boolean := false;
  v_allow_monsters boolean := false;
  v_allow_npcs boolean := false;
  v_allow_shops boolean := false;
  v_connections jsonb := '[]'::jsonb;
  v_monsters jsonb := '[]'::jsonb;
  v_npcs jsonb := '[]'::jsonb;
  v_shops jsonb := '[]'::jsonb;
begin
  select ge.id,ge.entity_code,ge.slug,ge.public_name,ge.short_description
    into v_map_id,v_code,v_slug,v_name,v_desc
  from public.game_entities ge
  join genesis_private.map_master mm on mm.entity_id=ge.id
  join public.story_parts first_sp on first_sp.id=ge.first_public_part_id
  where ge.entity_type='map'
    and ge.status='active'
    and ge.slug=p_slug
    and first_sp.canon_status='final'
    and first_sp.publication_status='published'
    and first_sp.publish_at is not null
    and first_sp.publish_at<=now()
  limit 1;

  if v_map_id is null then
    return null;
  end if;

  select coalesce(jsonb_object_agg(er.field_key,er.value_json order by er.reveal_order),'{}'::jsonb)
    into v_fields
  from public.entity_reveals er
  join public.story_parts rsp on rsp.id=er.reveal_part_id
  where er.entity_id=v_map_id
    and rsp.canon_status='final'
    and rsp.publication_status='published'
    and rsp.publish_at is not null
    and rsp.publish_at<=now();

  select exists(
    select 1 from public.entity_reveals er
    join public.story_parts sp on sp.id=er.reveal_part_id
    where er.entity_id=v_map_id
      and er.field_key in ('connections','connected_maps','routes')
      and sp.canon_status='final' and sp.publication_status='published'
      and sp.publish_at is not null and sp.publish_at<=now()
  ) into v_allow_connections;

  select exists(
    select 1 from public.entity_reveals er
    join public.story_parts sp on sp.id=er.reveal_part_id
    where er.entity_id=v_map_id
      and er.field_key in ('monsters','monster_ids','bestiary','encounters')
      and sp.canon_status='final' and sp.publication_status='published'
      and sp.publish_at is not null and sp.publish_at<=now()
  ) into v_allow_monsters;

  select exists(
    select 1 from public.entity_reveals er
    join public.story_parts sp on sp.id=er.reveal_part_id
    where er.entity_id=v_map_id
      and er.field_key in ('npcs','npc_ids','people')
      and sp.canon_status='final' and sp.publication_status='published'
      and sp.publish_at is not null and sp.publish_at<=now()
  ) into v_allow_npcs;

  select exists(
    select 1 from public.entity_reveals er
    join public.story_parts sp on sp.id=er.reveal_part_id
    where er.entity_id=v_map_id
      and er.field_key in ('shops','shop_ids','services')
      and sp.canon_status='final' and sp.publication_status='published'
      and sp.publish_at is not null and sp.publish_at<=now()
  ) into v_allow_shops;

  if v_allow_connections then
    select coalesce(jsonb_agg(x.obj order by x.sort_name),'[]'::jsonb)
      into v_connections
    from (
      select distinct on (other_ge.id)
        other_ge.public_name as sort_name,
        jsonb_build_object(
          'entity_code',other_ge.entity_code,
          'slug',other_ge.slug,
          'public_name',other_ge.public_name,
          'short_description',other_ge.short_description,
          'href','/world/map/?slug='||other_ge.slug,
          'art',jsonb_build_object('status','PLACEHOLDER','url',null)
        ) as obj
      from genesis_private.map_routes mr
      join public.game_entities other_ge
        on other_ge.id=case
          when mr.origin_map_entity_id=v_map_id then mr.destination_map_entity_id
          else mr.origin_map_entity_id
        end
      join public.story_parts other_sp on other_sp.id=other_ge.first_public_part_id
      where mr.is_active=true
        and (mr.origin_map_entity_id=v_map_id or mr.destination_map_entity_id=v_map_id)
        and other_ge.entity_type='map'
        and other_ge.status='active'
        and other_sp.canon_status='final'
        and other_sp.publication_status='published'
        and other_sp.publish_at is not null
        and other_sp.publish_at<=now()
      order by other_ge.id,other_ge.public_name
    ) x;
  end if;

  if v_allow_monsters then
    select coalesce(jsonb_agg(x.obj order by x.sort_name),'[]'::jsonb)
      into v_monsters
    from (
      select distinct on (mge.id)
        mge.public_name as sort_name,
        jsonb_build_object(
          'entity_code',mge.entity_code,
          'entity_type','monster',
          'slug',mge.slug,
          'public_name',mge.public_name,
          'short_description',mge.short_description,
          'revealed_fields',coalesce((
            select jsonb_object_agg(er.field_key,er.value_json order by er.reveal_order)
            from public.entity_reveals er
            join public.story_parts rsp on rsp.id=er.reveal_part_id
            where er.entity_id=mge.id
              and rsp.canon_status='final'
              and rsp.publication_status='published'
              and rsp.publish_at is not null
              and rsp.publish_at<=now()
          ),'{}'::jsonb),
          'href','/codex/?type=monster&q='||replace(mge.public_name,' ','%20'),
          'art',jsonb_build_object('status','PLACEHOLDER','url',null)
        ) as obj
      from genesis_private.spawn_profiles sp
      join public.game_entities mge on mge.id=sp.monster_entity_id
      join public.story_parts msp on msp.id=mge.first_public_part_id
      where sp.map_entity_id=v_map_id
        and sp.is_active=true
        and mge.entity_type='monster'
        and mge.status='active'
        and msp.canon_status='final'
        and msp.publication_status='published'
        and msp.publish_at is not null
        and msp.publish_at<=now()
      order by mge.id,mge.public_name
    ) x;
  end if;

  if v_allow_npcs then
    select coalesce(jsonb_agg(x.obj order by x.sort_name),'[]'::jsonb)
      into v_npcs
    from (
      select distinct on (nge.id)
        nge.public_name as sort_name,
        jsonb_build_object(
          'entity_code',nge.entity_code,
          'entity_type','npc',
          'slug',nge.slug,
          'public_name',nge.public_name,
          'short_description',nge.short_description,
          'href','/codex/?type=npc&q='||replace(nge.public_name,' ','%20'),
          'art',jsonb_build_object('status','PLACEHOLDER','url',null)
        ) as obj
      from genesis_private.npc_master n
      join public.game_entities nge on nge.id=n.entity_id
      join public.story_parts nsp on nsp.id=nge.first_public_part_id
      where n.map_entity_id=v_map_id
        and nge.entity_type='npc'
        and nge.status='active'
        and nsp.canon_status='final'
        and nsp.publication_status='published'
        and nsp.publish_at is not null
        and nsp.publish_at<=now()
      order by nge.id,nge.public_name
    ) x;
  end if;

  if v_allow_shops then
    select coalesce(jsonb_agg(x.obj order by x.sort_name),'[]'::jsonb)
      into v_shops
    from (
      select distinct on (sge.id)
        sge.public_name as sort_name,
        jsonb_build_object(
          'entity_code',sge.entity_code,
          'entity_type','shop',
          'slug',sge.slug,
          'public_name',sge.public_name,
          'short_description',sge.short_description,
          'href','/codex/?type=shop&q='||replace(sge.public_name,' ','%20'),
          'art',jsonb_build_object('status','PLACEHOLDER','url',null)
        ) as obj
      from genesis_private.shop_master s
      join public.game_entities sge on sge.id=s.entity_id
      join public.story_parts ssp on ssp.id=sge.first_public_part_id
      where s.map_entity_id=v_map_id
        and sge.entity_type='shop'
        and sge.status='active'
        and ssp.canon_status='final'
        and ssp.publication_status='published'
        and ssp.publish_at is not null
        and ssp.publish_at<=now()
      order by sge.id,sge.public_name
    ) x;
  end if;

  return jsonb_build_object(
    'contract_version','GENESIS-READER-ATLAS-DETAIL-V1',
    'fog_policy','FAIL_CLOSED',
    'map',jsonb_build_object(
      'entity_code',v_code,
      'slug',v_slug,
      'public_name',v_name,
      'short_description',v_desc,
      'reveal_state','DISCOVERED',
      'region',coalesce(nullif(v_fields->>'region',''),'Discovered World'),
      'map_type',coalesce(nullif(v_fields->>'map_type',''),'MAP'),
      'revealed_fields',v_fields,
      'art',jsonb_build_object(
        'status','PLACEHOLDER',
        'url',null,
        'reason','No approved reader-safe Atlas artwork is bound yet.'
      )
    ),
    'cross_link_gates',jsonb_build_object(
      'connections',v_allow_connections,
      'monsters',v_allow_monsters,
      'npcs',v_allow_npcs,
      'shops',v_allow_shops
    ),
    'connections',v_connections,
    'monsters',v_monsters,
    'npcs',v_npcs,
    'shops',v_shops
  );
end;
$function$;

revoke execute on function public.api_atlas_map_detail_v1(text) from public;
grant execute on function public.api_atlas_map_detail_v1(text) to anon,authenticated,service_role;
