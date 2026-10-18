create or replace function public.genesis_admin_manuscript_stage1_repair(
  p_actor text,
  p_part_id uuid,
  p_body_text text,
  p_commander_request text,
  p_defect_tags jsonb,
  p_surgery_summary text,
  p_competence_status text,
  p_findings jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','genesis_private','public'
as $function$
begin
  perform public.genesis_admin_authorize(p_actor,'PRODUCTION_AUTHORIZE');
  if p_part_id is null then
    raise exception 'MANUSCRIPT_PART_REQUIRED' using errcode='22023';
  end if;
  if jsonb_typeof(coalesce(p_defect_tags,'[]'::jsonb)) <> 'array' then
    raise exception 'MANUSCRIPT_DEFECT_TAGS_MUST_BE_ARRAY' using errcode='22023';
  end if;
  return genesis_private.builder_commit_stage1_prose_repair_v2(
    p_part_id,p_body_text,p_commander_request,p_defect_tags,
    p_surgery_summary,p_competence_status,p_findings
  );
end;
$function$;

revoke all on function public.genesis_admin_manuscript_stage1_repair(text,uuid,text,text,jsonb,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.genesis_admin_manuscript_stage1_repair(text,uuid,text,text,jsonb,text,text,jsonb) to service_role;
