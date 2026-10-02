-- Contract checks for GENESIS Admin Database V2.
do $$
declare
  v_domains integer;
begin
  if has_function_privilege('anon','public.genesis_admin_game_database_summary_v2(text)','EXECUTE') then
    raise exception 'anon must not execute genesis_admin_game_database_summary_v2';
  end if;
  if has_function_privilege('authenticated','public.genesis_admin_game_database_list_v2(text,text,text,integer,integer)','EXECUTE') then
    raise exception 'authenticated must not execute genesis_admin_game_database_list_v2';
  end if;
  if not has_function_privilege('service_role','public.genesis_admin_game_database_summary_v2(text)','EXECUTE') then
    raise exception 'service_role must execute genesis_admin_game_database_summary_v2';
  end if;

  select count(distinct domain) into v_domains
  from genesis_private.admin_game_database_expanded_index_v2;

  if v_domains < 18 then
    raise exception 'expected at least 18 expanded Admin domains, found %',v_domains;
  end if;

  if not exists (
    select 1 from genesis_private.admin_game_database_expanded_index_v2
    where domain='monster_catalog'
  ) then
    raise exception 'monster_catalog domain missing';
  end if;

  if not exists (
    select 1 from genesis_private.admin_game_database_expanded_index_v2
    where domain='equipment_catalog'
  ) then
    raise exception 'equipment_catalog domain missing';
  end if;
end $$;
