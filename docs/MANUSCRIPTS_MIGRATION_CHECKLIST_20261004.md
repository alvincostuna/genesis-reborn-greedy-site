# GENESIS Manuscripts Migration Checklist

Date: 2026-10-04
Phase: Admin Migration Step 3 — Manuscripts
Mode: NON-DESTRUCTIVE / READ-ONLY

## A. Pre-migration freeze

- [ ] Current Core production records untouched
- [ ] Current manuscript rows untouched
- [ ] Existing four bridge endpoints remain 4/4 PASS
- [ ] Current Admin shell V2 remains deployed
- [ ] Legacy Manuscript routes remain available only as temporary parity reference
- [ ] No legacy route removed before parity sign-off

## B. Core surface creation

- [ ] Create genesis_bridge.manuscripts_index_v1
- [ ] Confirm view contains no body_text
- [ ] Confirm required index columns are present
- [ ] Create genesis_bridge.manuscript_versions_v1
- [ ] Confirm required version columns are present
- [ ] Confirm body_text is present only on version surface
- [ ] Confirm views do not expose unrelated secrets/private control fields
- [ ] Confirm stable row identity by production_part_id

## C. Bridge role grants

- [ ] genesis_bridge_reader has USAGE on genesis_bridge
- [ ] genesis_bridge_reader has SELECT on manuscripts_index_v1
- [ ] genesis_bridge_reader has SELECT on manuscript_versions_v1
- [ ] genesis_bridge_login inherits genesis_bridge_reader
- [ ] genesis_bridge_login has no schema usage on genesis_private
- [ ] genesis_bridge_login has no SELECT on genesis_private tables
- [ ] no write privilege exists
- [ ] no mutation routine EXECUTE privilege exists
- [ ] no elevated role flags

## D. Platform Edge Functions

### genesis-manuscripts-index

- [ ] deployed
- [ ] verify_jwt=true
- [ ] GET only
- [ ] active admin_users membership required
- [ ] q validated
- [ ] saga validated
- [ ] episode validated
- [ ] state validated
- [ ] limit bounded <= 200
- [ ] offset bounded >= 0
- [ ] SQL parameterized
- [ ] response envelope matches contract
- [ ] generic errors only

### genesis-manuscript-version

- [ ] deployed
- [ ] verify_jwt=true
- [ ] GET only
- [ ] active admin_users membership required
- [ ] part_id strict UUID validation
- [ ] stage strict enum validation
- [ ] no arbitrary stage names
- [ ] no public cache
- [ ] body_text returned only to authenticated Admin
- [ ] response envelope matches contract

### genesis-manuscript-compare

- [ ] implemented using allowed version reads
- [ ] no extra Core privilege
- [ ] no write path
- [ ] from/to stage validated

## E. Data parity gate

Index parity:
- [ ] same Part count for default query
- [ ] same result count for Episode filter sample
- [ ] same result count for text-search sample
- [ ] same part_key values
- [ ] same titles
- [ ] same dashboard_state
- [ ] same stage1_available
- [ ] same stage2_available
- [ ] same final_canon_available
- [ ] same stage word counts

Version parity:
- [ ] sample Stage 1 metadata matches
- [ ] sample Stage 2 metadata matches
- [ ] sample Final Canon metadata matches
- [ ] content_hash matches legacy source
- [ ] body_text hash matches legacy source
- [ ] word_count matches

Minimum sample:
- [ ] at least 3 Parts
- [ ] include one Part without Final Canon if available
- [ ] include one Final Canon Part
- [ ] include one early Episode Part
- [ ] include one latest committed Part

## F. Auth / RBAC gate

- [ ] no Authorization -> 401
- [ ] invalid token -> 401
- [ ] valid non-admin user -> 403
- [ ] inactive admin -> 403
- [ ] active admin -> 200
- [ ] token expiry handled without exposing internals

## G. Read-only boundary gate

- [ ] INSERT test denied
- [ ] UPDATE test denied
- [ ] DELETE test denied
- [ ] TRUNCATE test denied
- [ ] direct genesis_private schema usage denied
- [ ] direct Core base-table SELECT denied
- [ ] no SECURITY DEFINER escalation path
- [ ] no service-role key in frontend
- [ ] no DB password in frontend
- [ ] no secret in logs

## H. UI parity gate

- [ ] Manuscripts screen opens from STORY group
- [ ] source badge shows CORE · READ ONLY
- [ ] search works
- [ ] Episode filter works
- [ ] table sorting/order matches expected UX
- [ ] clicking a Part opens viewer
- [ ] Stage 1 tab works
- [ ] Stage 2 tab works
- [ ] Final Canon tab works
- [ ] unavailable stage shows controlled message
- [ ] Compare S1 <-> S2 works
- [ ] Preview as Reader works
- [ ] metadata grid renders
- [ ] long manuscript body scrolls correctly
- [ ] desktop layout preserved
- [ ] mobile behavior preserved or explicitly replaced
- [ ] no legacy Core quota error replaces the entire screen

## I. Failure-isolation gate

- [ ] simulate missing Platform session -> inline login only
- [ ] simulate bridge 502 -> Manuscripts local error only
- [ ] Overview remains usable
- [ ] Readers remains usable
- [ ] Administrators remains usable
- [ ] Bridge Health remains usable
- [ ] navigation remains usable
- [ ] no auto-fallback to legacy Core RPC

## J. Performance gate

- [ ] default index request completes within acceptable Admin latency
- [ ] filtered index request bounded
- [ ] manuscript body request loads one version only
- [ ] compare loads only two versions
- [ ] no N+1 Core reads for index table
- [ ] body_text never included in index response
- [ ] max result limit enforced

## K. Logging / audit gate

- [ ] successful index reads observable
- [ ] successful version reads observable
- [ ] auth failures observable
- [ ] bridge failures observable
- [ ] logs contain no passwords
- [ ] logs contain no connection URI
- [ ] logs contain no full manuscript body

## L. Cutover gate

Only after A-K PASS:

- [ ] Admin frontend switched from /admin/api/manuscripts? to genesis-manuscripts-index
- [ ] version viewer switched to genesis-manuscript-version
- [ ] compare switched to bridge-backed version reads
- [ ] preview switched to bridge-backed version reads
- [ ] legacy manuscript routes marked DEPRECATED
- [ ] rollback window defined
- [ ] post-deploy smoke test PASS
- [ ] legacy manuscript routes not deleted yet

## M. Final retirement gate

Only after stable operation:

- [ ] no frontend references to legacy manuscript routes
- [ ] no operational dependency on genesis_admin_manuscript_index
- [ ] no operational dependency on genesis_admin_manuscript_version
- [ ] no operational dependency on genesis_admin_manuscript_compare
- [ ] old routes removed or isolated from active Admin path
- [ ] migration audit updated
- [ ] Step 3 Manuscripts marked DONE
- [ ] Step 4 World Database becomes CURRENT

## Stop conditions

Stop migration immediately if any of the following occurs:

- Core manuscript data differs from bridge result
- content_hash mismatch
- body_text mismatch
- bridge role receives unexpected private-table access
- any write privilege is discovered
- auth bypass is possible
- non-admin can read body_text
- secret appears in logs
- production/roadmap/lock state changes unexpectedly
