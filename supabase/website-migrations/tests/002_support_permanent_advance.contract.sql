-- CONTRACT TEST 002
do $$
declare j jsonb; r jsonb;
begin
  if (select count(*) from public.support_reward_rules where active and rule_key in ('SUPPORT_9','SUPPORT_49','SUPPORT_189'))<>3 then
    raise exception 'T2_NEW_RULES_FAIL';
  end if;
  if exists(select 1 from public.support_reward_rules where active and rule_key in ('SUPPORT_10','SUPPORT_50','VIP_200')) then
    raise exception 'T2_OLD_RULES_STILL_ACTIVE';
  end if;
  if (select advance_credits from public.support_reward_rules where rule_key='SUPPORT_9')<>2 then raise exception 'T2_9_PARTS_FAIL'; end if;
  if (select advance_credits from public.support_reward_rules where rule_key='SUPPORT_49')<>14 then raise exception 'T2_49_PARTS_FAIL'; end if;
  if (select advance_credits from public.support_reward_rules where rule_key='SUPPORT_189')<>60 then raise exception 'T2_189_PARTS_FAIL'; end if;
  if (select exp_reward from public.support_reward_rules where rule_key='SUPPORT_9')<>100 then raise exception 'T2_9_EXP_FAIL'; end if;
  if (select exp_reward from public.support_reward_rules where rule_key='SUPPORT_49')<>500 then raise exception 'T2_49_EXP_FAIL'; end if;
  if (select exp_reward from public.support_reward_rules where rule_key='SUPPORT_189')<>2000 then raise exception 'T2_189_EXP_FAIL'; end if;
  if (select exp_reward from public.support_reward_rules where rule_key='VERIFIED_SHARE')<>200 then raise exception 'T2_SHARE_EXP_FAIL'; end if;
  j:=public.api_support_catalog_v4();
  if j->>'contract_version'<>'GENESIS-SUPPORT-V4' then raise exception 'T2_CATALOG_VERSION_FAIL'; end if;
end $$;
