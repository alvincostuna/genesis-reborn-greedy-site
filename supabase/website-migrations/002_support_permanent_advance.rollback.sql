-- Rollback WEB MIGRATION 002 (immediate rollback only)
drop function if exists public.api_support_catalog_v4();
drop function if exists public.reader_can_access_part_v2(uuid,uuid);
drop function if exists public.reader_unlock_next_advance_part_v2();
drop function if exists public.api_episode_parts_for_reader_v3(integer);
update public.support_reward_rules set active=true where rule_key in ('SUPPORT_10','SUPPORT_50','VIP_200');
update public.support_reward_rules set active=false where rule_key in ('SUPPORT_9','SUPPORT_49','SUPPORT_189');
update genesis_private.payment_provider_settings
set test_allowed_rule_keys='["SUPPORT_10"]'::jsonb,updated_at=now()
where provider='PAYMONGO' and provider_enabled=false;
