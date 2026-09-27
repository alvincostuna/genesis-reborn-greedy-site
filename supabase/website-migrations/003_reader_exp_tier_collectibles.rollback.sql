-- Rollback WEB MIGRATION 003 (immediate rollback only; only safe before real reader EXP/rewards exist)
drop trigger if exists trg_reader_progress_exp_settle_v1 on public.reader_progress;
drop trigger if exists trg_support_exp_settle_v1 on public.support_transactions;
drop trigger if exists trg_share_reward_settle_v1 on public.share_reward_claims;
drop function if exists public.reader_progress_exp_settle_v1();
drop function if exists public.support_exp_settle_v1();
drop function if exists public.share_reward_settle_v1();
drop function if exists public.reader_draw_collectible_v1();
drop function if exists public.api_reader_account_v3();
drop function if exists public.award_reader_exp_v1(uuid,text,text,integer,uuid,jsonb);
drop function if exists public.reader_tier(uuid);
drop function if exists public.reader_total_exp(uuid);
drop table if exists public.reader_profile_showcase;
drop table if exists public.reader_collectible_inventory;
drop table if exists public.reader_collectible_draws;
drop table if exists public.reader_collectible_catalog;
drop table if exists public.reader_exp_ledger;
