# GENESIS Manuscripts Bridge Contracts

Date: 2026-10-04
Status: FROZEN CONTRACT DRAFT
Scope: Admin read-only migration for Manuscripts
Safety: NON-DESTRUCTIVE

## Purpose

Move the GENESIS Admin Manuscripts screen off the legacy Core Admin RPC path and onto the isolated Core -> GENESIS PLATFORM read-only bridge.

This contract does NOT authorize:
- Core writes
- manuscript mutation
- roadmap mutation
- production mutation
- publication mutation
- public/reader manuscript access
- direct genesis_private access

Core remains authoritative.

---

## Contract MBR-001 — Manuscript Index

### Platform Edge Function
Name:
- genesis-manuscripts-index

Method:
- GET only

Authentication:
- GENESIS PLATFORM JWT required
- active row in public.admin_users required
- inactive/non-admin users denied

Core data source:
- genesis_bridge.manuscripts_index_v1

Bridge role:
- genesis_bridge_login
- SELECT only

### Allowed query parameters

- q
  - type: text
  - optional
  - purpose: part key/title search
  - max length: 200

- saga
  - type: integer
  - optional
  - range: 1..99

- episode
  - type: integer
  - optional
  - range: 1..9999

- state
  - type: text enum
  - optional
  - accepted values must be explicitly validated by the function

- limit
  - type: integer
  - optional
  - default: 100
  - max: 200

- offset
  - type: integer
  - optional
  - default: 0
  - min: 0

All query values must be parameterized.

No dynamic schema names.
No dynamic table names.
No arbitrary ORDER BY input.

### Required returned columns

- production_part_id
- roadmap_version_id
- saga_number
- episode_number
- part_number
- part_key
- title
- dashboard_state
- stage1_available
- stage2_available
- final_canon_available
- stage1_word_count
- stage2_word_count
- final_word_count
- latest_stage
- updated_at

### Response envelope

{
  "endpoint": "genesis-manuscripts-index",
  "mode": "read_only",
  "row_count": <integer>,
  "limit": <integer>,
  "offset": <integer>,
  "data": [ ... ]
}

### Error behavior

401
- missing_authorization
- invalid_session

403
- admin_required

405
- method_not_allowed

422
- invalid_query

502
- core_bridge_unavailable

503
- bridge_disabled

The function must never return the Core connection string, password, SQL text containing secrets, or stack traces.

---

## Contract MBR-002 — Manuscript Version

### Platform Edge Function
Name:
- genesis-manuscript-version

Method:
- GET only

Authentication:
- GENESIS PLATFORM JWT required
- active row in public.admin_users required

Core data source:
- genesis_bridge.manuscript_versions_v1

Bridge role:
- genesis_bridge_login
- SELECT only

### Required selectors

- part_id
  - UUID
  - required

- stage
  - required
  - enum:
    - stage1
    - stage2
    - final

No other stage aliases are accepted at the bridge boundary.

### Required returned columns

- production_part_id
- roadmap_version_id
- part_key
- title
- stage
- version_number
- word_count
- content_hash
- source_system
- created_by_engine
- continuity_verified
- qa_verified
- created_at
- body_text

### Response envelope

{
  "endpoint": "genesis-manuscript-version",
  "mode": "read_only",
  "row_count": 1,
  "data": [ ... ]
}

If the requested stage does not exist:

404
- manuscript_version_not_found

### Body-content rules

- body_text is Admin-only.
- body_text must never be exposed through anon/public endpoints.
- body_text must never be cached publicly.
- no public CDN cache headers.
- response should use no-store/private behavior where possible.
- no body mutation route is permitted.

---

## Contract MBR-003 — Manuscript Compare

No dedicated Core view is required.

Platform implementation:
1. validate Admin JWT
2. validate part_id UUID
3. validate from_stage
4. validate to_stage
5. read two rows through the same allowed manuscript version surface
6. return:

{
  "endpoint": "genesis-manuscript-compare",
  "mode": "read_only",
  "from": { ... },
  "to": { ... }
}

Recommended function name:
- genesis-manuscript-compare

Allowed stages:
- stage1
- stage2
- final

No Core stored procedure is required solely for comparison.

The browser may keep its current paragraph-level diff renderer.

---

## Contract MBR-004 — Manuscript Preview

No dedicated Core view is required.

Preview must reuse MBR-002.

Admin frontend flow:
1. read manuscript version
2. render body_text inside protected Admin preview dialog
3. display PRIVATE PREVIEW / NOT PUBLIC banner

No public preview URL is created.
No reader entitlement is created.
No release state changes.

---

## Contract MBR-005 — Manuscript Detail

Do not create a new endpoint unless index/version contracts prove insufficient.

Preferred rule:
- use manuscripts_index_v1 for list/detail metadata
- use manuscript_versions_v1 for version metadata/body

If later-required fields are genuinely absent:
- add a narrowly scoped manuscripts_detail_v1 bridge surface
- document each additional column before grant/deploy

Do not expose raw Core rows merely for convenience.

---

## Core bridge surface contract

### genesis_bridge.manuscripts_index_v1

Properties:
- read-only projection
- no body_text
- no private/internal secrets
- stable column names
- one logical row per production Part
- suitable for filtered Admin listing

### genesis_bridge.manuscript_versions_v1

Properties:
- read-only projection
- one logical row per Part + stage/version target selected by the contract
- body_text allowed because this is Admin-only
- no mutation columns or write function exposure
- no credentials
- no unrelated production-control fields

---

## Required bridge grants

Target role:
- genesis_bridge_reader

Required:
- USAGE on schema genesis_bridge
- SELECT on:
  - genesis_bridge.manuscripts_index_v1
  - genesis_bridge.manuscript_versions_v1

Then inherited by:
- genesis_bridge_login

Forbidden:
- USAGE on genesis_private
- SELECT on genesis_private.*
- INSERT
- UPDATE
- DELETE
- TRUNCATE
- REFERENCES
- TRIGGER
- EXECUTE on mutation routines
- BYPASSRLS
- SUPERUSER
- CREATEDB
- CREATEROLE
- REPLICATION

---

## Function hardening contract

Every Manuscripts Edge Function must:

- verify JWT
- verify active admin_users membership
- accept GET only
- use GENESIS_CORE_DB_URL only server-side
- open at most a small bounded number of DB connections
- use bounded connect timeout
- use parameterized SQL
- not interpolate user input into SQL identifiers
- close DB client in finally
- return generic bridge failure messages
- log endpoint/error class without logging secrets
- set CORS consistently with existing Admin bridge functions
- never expose GENESIS_CORE_DB_URL

---

## Frontend migration contract

The Admin Manuscripts UI must preserve:

- search
- Episode filter
- existing Part table
- Stage 1 tab
- Stage 2 tab
- Final Canon tab
- compare Stage 1 <-> Stage 2
- protected reader-style preview
- metadata rendering
- mobile behavior

New source badge:
- CORE · READ ONLY

On missing Platform session:
- show inline Platform login panel
- do not fall back to legacy Core RPC

On bridge failure:
- show local Manuscripts error
- keep Admin shell operational

---

## Explicit non-goals

This phase does NOT:
- migrate manuscripts into Platform storage
- duplicate Final Canon into Platform
- make manuscripts reader-visible
- resume production
- change release status
- change roadmap
- change lock revision
- alter Core production history
