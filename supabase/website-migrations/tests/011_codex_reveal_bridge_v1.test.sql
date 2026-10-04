-- GENESIS CORE: Codex bridge validation
-- Expected baseline at cutover preparation: legacy Codex total = 41.

select grantee,table_schema,table_name,privilege_type
from information_schema.role_table_grants
where grantee in ('genesis_bridge_reader','genesis_bridge_login')
  and (
    (table_schema='genesis_bridge' and table_name='codex_reveal_index_v1')
    or table_schema='genesis_private'
  )
order by grantee,table_schema,table_name,privilege_type;

select member_role.rolname as member, granted_role.rolname as granted_role
from pg_auth_members m
join pg_roles member_role on member_role.oid=m.member
join pg_roles granted_role on granted_role.oid=m.roleid
where member_role.rolname='genesis_bridge_login'
  and granted_role.rolname='genesis_bridge_reader';

select public.genesis_admin_codex_reveal_index(
  'hirangnalupa@gmail.com',
  null,
  null,
  1,
  0
) as legacy_contract_probe;
