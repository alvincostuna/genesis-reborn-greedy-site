-- Rollback WEB MIGRATION 001 (immediate rollback only)
drop function if exists public.api_release_clock_v2();
drop function if exists public.api_episode_library_v2();
drop function if exists genesis_private.process_due_releases_v2(text);
update public.release_settings
set cycle_anchor_local='06:00:00'::time,cycle_hours=8,updated_at=now()
where id=1 and releases_paused=true and launch_authorized=false;
