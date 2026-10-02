-- Roll back only the V2 website/Admin read layer.
-- The V1 Admin database contracts remain untouched.
drop function if exists public.genesis_admin_game_database_list_v2(text,text,text,integer,integer);
drop function if exists public.genesis_admin_game_database_summary_v2(text);
drop view if exists genesis_private.admin_game_database_expanded_index_v2;
