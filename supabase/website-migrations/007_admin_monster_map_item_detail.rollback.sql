-- Roll back GENESIS protected Monster / Map / Item detail contract.
drop function if exists public.genesis_admin_entity_detail_v2(text,uuid,text);
