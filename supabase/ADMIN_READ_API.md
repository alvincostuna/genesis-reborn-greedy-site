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
