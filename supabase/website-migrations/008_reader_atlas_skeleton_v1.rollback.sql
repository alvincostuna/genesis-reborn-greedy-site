-- Roll back GENESIS Reader Atlas V1 contracts.
drop function if exists public.api_atlas_map_detail_v1(text);
drop function if exists public.api_atlas_map_index_v1(text,integer);
drop function if exists public.api_entity_search_v2(text,text,integer);
