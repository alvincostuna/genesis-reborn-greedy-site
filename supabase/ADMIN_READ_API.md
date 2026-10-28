# Supabase Admin Read API

Migration 015 installed private read-only manuscript inspection functions and narrow public-schema RPC bridges for the Cloudflare Worker.

Private entrypoints:

- `genesis_private.admin_manuscript_index_entry`
- `genesis_private.admin_manuscript_detail_entry`
- `genesis_private.admin_manuscript_version_entry`
- `genesis_private.admin_manuscript_compare_entry`
- `genesis_private.admin_release_queue_entry`

Server bridge RPCs:

- `public.genesis_admin_dashboard`
- `public.genesis_admin_manuscript_index`
- `public.genesis_admin_manuscript_detail`
- `public.genesis_admin_manuscript_version`
- `public.genesis_admin_manuscript_compare`
- `public.genesis_admin_release_queue`

The bridge RPCs are executable by `service_role` only. `public`, `anon`, and `authenticated` EXECUTE permissions are revoked.

The service-role key must exist only as a Cloudflare Worker secret. It must never be sent to browser JavaScript or committed to Git.


## Stage 1 repair write bridge

The Admin Worker exposes a guarded POST route at /admin/api/manuscripts/stage1-repair and a direct GET read-back route at /admin/api/manuscripts/version?part_id=...&stage=stage1. The write bridge calls public.genesis_admin_manuscript_stage1_repair, which requires PRODUCTION_AUTHORIZE and delegates to the existing Builder Stage 1 maintenance workflow. The maintenance gate, voice-flow validation, 1,500–3,500 word constraint, version history, handoff checks, and post-checks remain authoritative. Only service_role can execute the public RPC; the service-role key remains in the Worker secret.

The Admin editor saves a new Stage 1 repair version; it does not overwrite prior versions, write Stage 2, or publish content. After a save, the UI fetches the version directly from Core Supabase and checks that the saved body exactly matches the submitted text before displaying a verified status.
