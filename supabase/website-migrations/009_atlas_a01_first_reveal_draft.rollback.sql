-- Roll back the Atlas A01 prepared reveal candidate only.
delete from genesis_private.roadmap_public_reveal_plan
where roadmap_version_id='eb89b0a1-36e1-4239-9368-e370a259bc9b'::uuid
  and entity_id='05e07106-0008-47e1-af93-247810ca7b34'::uuid
  and roadmap_part_id='6ec918a4-17bd-488e-a79f-b79856b77e83'::uuid
  and reveal_kind='FIRST_PUBLIC'
  and status='DRAFT'
  and notes like 'ATLAS-A01 first reader-map reveal candidate.%';
