-- GENESIS CORE: Codex read bridge v1
-- Non-destructive, read-only bridge.
-- Core remains authoritative for canonical reveal evidence.

begin;

create or replace view genesis_bridge.codex_reveal_index_v1
as
select
  rp.id as core_reveal_id,
  rp.roadmap_version_id,
  rv.version_number as roadmap_version,
  rv.status as roadmap_status,
  ge.id as entity_id,
  ge.entity_code,
  ge.entity_type,
  ge.canonical_name,
  ge.public_name,
  rp.roadmap_part_id as part_id,
  rp2.part_key,
  ep.effective_title as part_title,
  rp2.production_order,
  rp.reveal_kind,
  rp.public_fields,
  rp.status,
  rp.notes,
  rp.created_at,
  rp.updated_at,
  exists(
    select 1
    from public.story_parts sp
    where sp.part_key = rp2.part_key
      and sp.publication_status = 'published'
      and (
        ge.first_public_part_id = sp.id
        or exists(
          select 1
          from public.entity_reveals er
          where er.entity_id = ge.id
            and er.reveal_part_id = sp.id
        )
      )
  ) as executed,
  coalesce((
    select jsonb_build_object(
      'episode',fu.first_episode_number,
      'part_key',fu.first_part_key,
      'kind',fu.first_use_kind,
      'reveal_mode',fu.reveal_mode
    )
    from genesis_private.roadmap_entity_first_use fu
    where fu.roadmap_version_id = rp.roadmap_version_id
      and fu.entity_id = rp.entity_id
    order by case when fu.reveal_mode='PUBLIC' then 0 else 1 end
    limit 1
  ),'{}'::jsonb) as first_use
from genesis_private.roadmap_public_reveal_plan rp
join genesis_private.roadmap_versions rv
  on rv.id = rp.roadmap_version_id
join public.game_entities ge
  on ge.id = rp.entity_id
join genesis_private.roadmap_parts rp2
  on rp2.id = rp.roadmap_part_id
join genesis_private.roadmap_effective_parts_v1 ep
  on ep.id = rp.roadmap_part_id;

revoke all on genesis_bridge.codex_reveal_index_v1 from public;
grant select on genesis_bridge.codex_reveal_index_v1 to genesis_bridge_reader;

commit;
