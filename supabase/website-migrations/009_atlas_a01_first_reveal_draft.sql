-- GENESIS Atlas A01: prepare the first map FIRST_PUBLIC reveal as DRAFT only.
-- This migration MUST NOT publish the map or mutate story/release state.

insert into genesis_private.roadmap_public_reveal_plan(
  roadmap_version_id,
  entity_id,
  roadmap_part_id,
  reveal_kind,
  public_fields,
  status,
  notes
)
select
  'eb89b0a1-36e1-4239-9368-e370a259bc9b'::uuid,
  '05e07106-0008-47e1-af93-247810ca7b34'::uuid,
  '6ec918a4-17bd-488e-a79f-b79856b77e83'::uuid,
  'FIRST_PUBLIC',
  '{"region":"Hiraya","map_type":"TOWN"}'::jsonb,
  'DRAFT',
  'ATLAS-A01 first reader-map reveal candidate. Based on historical V3 E004-P01 placement and active V4 E004-P01 MAP / ARRIVAL anchor. Prepared only; do not approve or execute until MAP-000001 artwork passes review/web export and E004-P01 is published Final Canon.'
where not exists (
  select 1
  from genesis_private.roadmap_public_reveal_plan rp
  where rp.roadmap_version_id='eb89b0a1-36e1-4239-9368-e370a259bc9b'::uuid
    and rp.entity_id='05e07106-0008-47e1-af93-247810ca7b34'::uuid
    and rp.roadmap_part_id='6ec918a4-17bd-488e-a79f-b79856b77e83'::uuid
    and rp.reveal_kind='FIRST_PUBLIC'
);
