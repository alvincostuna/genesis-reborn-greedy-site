# GENESIS Platform-Native Route Migration Map

Date: 2026-10-04
Status: ACTIVE MIGRATION MAP
Scope: Admin screens labeled PLATFORM · MANAGED HERE
Rule: These screens must stop depending on the quota-restricted Core Admin API except where a narrowly defined Core read-only fact is genuinely required.

## Shared session rule

One GENESIS PLATFORM Auth session per Admin browser tab.

Outer gate:
- Cloudflare Access protects the Admin URL.

Application identity:
- GENESIS PLATFORM Supabase Auth identifies the Admin user.
- public.admin_users determines active Admin membership / role.

Frontend behavior:
- one topbar Platform session control
- one shared login dialog
- session stored in sessionStorage
- bridge-backed and Platform-native screens reuse the same session
- individual screens must not render separate credential forms
- expired/missing session returns to the shared Platform login flow

## Route ownership map

### Administrators & Audit

Legacy routes:
- GET /admin/api/rbac
- GET /admin/api/rbac/principals
- GET /admin/api/rbac/audit?limit=100
- GET /admin/api/rbac/permissions
- POST /admin/api/rbac/bootstrap
- POST/management operations under /admin/api/rbac/...

Target owner:
- GENESIS PLATFORM

Target Platform data:
- auth.users
- public.admin_users
- Platform-owned RBAC / permissions / audit tables

Core dependency:
- NONE required for identity/RBAC.

Migration rule:
- do not bridge these through Core.
- build Platform Edge Functions / Platform RPCs directly on Platform data.

### Settings

Legacy routes:
- GET /admin/api/settings/features
- POST /admin/api/settings/features/*
- GET/POST /admin/api/settings/payment-provider
- GET/POST /admin/api/settings/payments

Target owner:
- GENESIS PLATFORM

Core dependency:
- NONE for Platform feature flags, payment configuration, or Admin settings.

Migration rule:
- settings must survive a Core outage.

### Readers

Legacy routes:
- GET /admin/api/readers?
- GET /admin/api/readers/:id
- POST /admin/api/readers/advance-grants/*

Target owner:
- GENESIS PLATFORM

Target Platform data:
- Supabase Auth users
- reader profiles
- reader progress
- access/advance grants
- supporter/VIP state

Core dependency:
- only canonical published-Part eligibility if needed.
- such eligibility must come from a narrow Core read-only publication fact, not from direct private-table access.

### Community

Legacy routes:
- GET /admin/api/community?limit=200
- POST /admin/api/community/fan-posts/*
- POST /admin/api/community/comments/*
- POST /admin/api/community/reports/*

Target owner:
- GENESIS PLATFORM

Target Platform data:
- fan posts
- comments
- reports
- moderation state
- moderation audit

Core dependency:
- optional canonical Part/entity labels only.
- no Core mutation required.

### Messages

Legacy routes:
- GET /admin/api/messages
- POST /admin/api/messages/:id/reply

Target owner:
- GENESIS PLATFORM

Target Platform data:
- contact inbox
- Admin replies
- delivery/audit status

Core dependency:
- NONE.

### Support

Legacy route:
- GET /admin/api/support/summary

Target owner:
- GENESIS PLATFORM

Target Platform data:
- support configuration
- supporter entitlements
- payment/support events
- reward/advance policy state

Core dependency:
- optional canonical release eligibility/read-only Part references.

### Art Assets

Legacy route:
- GET /admin/api/art-assets

Target owner:
- GENESIS PLATFORM for workflow/storage metadata.

Target Platform data:
- admin-art
- admin-staging
- admin-thumbnails
- asset manifest
- review/approval state
- entity binding metadata

Core dependency:
- canonical entity identity only through read-only World bridge.
- artwork existence/approval must never promote public Codex visibility.

### Website

Legacy route:
- GET /admin/api/website-ops

Target owner:
- GENESIS PLATFORM control plane.

Platform-owned state:
- official-site deployment/health
- published reader projection
- release queue state
- public publication state

Core dependency:
- canonical production facts only:
  - active production context
  - Final Canon availability
  - canonical Part identity
- those facts must come through existing/new read-only Core bridge endpoints.

Migration rule:
- Core outage must not erase Platform website operational state.

### Releases

Legacy routes:
- GET /admin/api/releases
- GET /admin/api/release-policy
- GET /admin/api/releases/launch-preview
- POST /admin/api/releases/verify-live-site
- POST /admin/api/releases/authorize-launch
- POST /admin/api/releases/pause
- POST /admin/api/releases/resume
- POST /admin/api/releases/:id/*

Target owner:
- GENESIS PLATFORM

Platform-owned state:
- release queue
- release policy
- launch authorization
- scheduling
- pause/resume state
- live-site verification
- release audit

Core dependency:
- read-only canonical facts:
  - Final Canon exists
  - Part identity/title
  - active roadmap/production context where required

Hard rule:
- Release actions must never write back into Core production/story tables.

## Hybrid / not Platform-native

### Production / Roadmap / Continuity / Authorities
Owner:
- CORE authoritative
- Platform reads via curated bridge

### Manuscripts
Owner:
- CORE authoritative
- Platform reads via curated manuscript bridge

### World Database
Owner:
- CORE authoritative
- Platform reads via curated World bridge

### Codex
Hybrid:
- canonical entity/story evidence: CORE read-only bridge
- reveal/projection/workflow state: PLATFORM

## Recommended Platform migration order

1. Shared Platform session — IMPLEMENTED
2. Administrators & Audit
3. Settings
4. Readers
5. Community
6. Messages
7. Support
8. Art Assets
9. Website
10. Releases

Reason:
- move purely Platform-native pages first
- leave Website/Releases until their narrow Core fact dependencies are explicit
- avoid rebuilding control-plane writes against Core by mistake

## Cutover gates for every Platform-native screen

- no active /admin/api/... dependency on quota-restricted Core Worker
- valid Platform JWT required
- active admin membership enforced
- Platform data remains readable when Core bridge is unavailable, except explicitly labeled Core fact widgets
- write operations target Platform only
- audit record written on privileged Platform mutations
- no Core DB URI/service secret exposed to browser
- screen-specific health badge replaces misleading global 4/4 bridge status

## Known current state

Still legacy-coupled at map creation:
- Releases
- Website
- Administrators & Audit
- Settings
- Readers
- Community
- Messages
- Support
- Art Assets
- Codex

Already bridge-migrated:
- Production
- Roadmap
- Continuity
- Authorities
- Manuscripts
- World Database summary/list

Codex remains a separate hybrid migration.
