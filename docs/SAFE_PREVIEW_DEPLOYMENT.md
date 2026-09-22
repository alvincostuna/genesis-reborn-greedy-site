# Safest Preview Deployment Plan

This plan is intentionally designed so the Admin Viewer can be tested without changing the live GENESIS website.

## Isolation model

The preview uses a separate Cloudflare Worker environment:

`genesis-reborn-greedy-site-preview`

The top-level Worker configuration is deliberately locked with:

- `workers_dev = false`
- `preview_urls = false`
- no routes
- no custom domain

The preview environment alone has:

- `workers_dev = true`
- `preview_urls = true`
- no route to the live GENESIS hostname
- no custom domain

The Worker itself serves only `/admin*` and returns 404 for every other path.

Therefore the live website is not replaced, proxied, or modified by this preview.

## Deployment method

The GitHub workflow is **manual only**.

It does not run on push, pull request, or merge.

The workflow uses:

`wrangler versions upload --env preview`

This uploads a new Worker version for preview testing rather than performing a production deployment.

## GitHub environment

Create a GitHub Environment named:

`genesis-admin-preview`

Store these environment secrets there:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The Cloudflare token should be scoped only to the account needed for Workers deployment. Do not use a global API key.

Do not put either value in repository files.

## Cloudflare Worker secrets

For the **preview environment only**, set:

- `SUPABASE_SERVICE_ROLE_KEY`
- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`

These are Worker secrets, not GitHub source files.

The preview Worker must never send the Supabase service-role key to browser JavaScript.

## Cloudflare Access

Protect the preview Worker with Cloudflare Access.

Recommended policy:

- Protect preview traffic for this Worker.
- Allow only the Commander's approved email.
- Deny everyone else.

The Worker also validates the Cloudflare Access JWT and checks `ADMIN_EMAILS`, giving a second authorization layer.

## First preview sequence

1. Keep the live GENESIS Worker/domain unchanged.
2. Configure the GitHub `genesis-admin-preview` environment.
3. Add Cloudflare account ID and scoped API token as GitHub environment secrets.
4. Upload the preview version manually from GitHub Actions.
5. In Cloudflare, configure Access for the preview Worker/preview URLs.
6. Set the three preview Worker secrets.
7. Open only the generated `workers.dev` preview URL.
8. Verify that unauthenticated access is blocked.
9. Sign in through Cloudflare Access.
10. Open `/admin`.
11. Verify the Production Dashboard.
12. Verify all 25 Stage-2 manuscripts.
13. Verify Stage 1/Stage 2 comparison.
14. Verify Preview as Reader.
15. Verify Release Queue is empty.
16. Verify the live GENESIS public site is unchanged.

## Hard prohibitions

During this phase:

- Do not add a Cloudflare route for the live hostname.
- Do not add a Custom Domain for the live hostname.
- Do not deploy this branch to the existing production Worker.
- Do not merge the PR to `main`.
- Do not run the real AI-1 103 closeout.
- Do not enable release mutations.
- Do not disable `releases_paused`.
- Do not alter ARS or TeacherHub.

## Promotion gate

Only after the Admin preview passes the Website-First acceptance checklist do we:

1. reconcile/import the existing public GENESIS website source;
2. rebuild the Supabase-native V10 system kit;
3. test fresh-chat recovery;
4. run the real AI-1 103;
5. verify 25 Final Canon / 25 Hidden release items;
6. decide how to integrate the Admin into the production GENESIS site.
