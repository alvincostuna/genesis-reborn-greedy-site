# World Database Cutover Verification

Date: 2026-10-04
Scope: World Database summary/list cutover only

## Static frontend verification

PASS:
- legacy /admin/api/database/summary reference removed from active Admin frontend
- legacy /admin/api/database? list reference removed from active Admin frontend
- genesis-world-summary present
- genesis-world-database present

Expected remaining legacy references:
- /admin/api/database/detail/... remains until protected-detail migration
- /admin/api/atlas-gates/... remains until Atlas migration

## Platform deployment

PASS:
- genesis-world-database deployed ACTIVE
- genesis-world-summary deployed ACTIVE
- verify_jwt=true on both

## Browser/network evidence available at audit time

Observed:
- CORS preflight OPTIONS 200 for genesis-world-summary
- CORS preflight OPTIONS 200 for genesis-world-database?domain=monsters&limit=100&offset=0

Full authenticated GET validation should be completed from the Admin browser session before marking the World list/summary migration fully closed.

## Core parity already established

PASS:
- all 11 Core domain counts match legacy Admin list totals
- all 18 expanded-domain counts match the canonical expanded index
- bridge role SELECT limited to approved World bridge views
- direct genesis_private usage remains denied

## Current status

World list/summary:
- CODE CUTOVER: PASS
- CORE DATA PARITY: PASS
- BRIDGE SECURITY: PASS
- LIVE AUTHENTICATED GET: PENDING BROWSER CONFIRMATION

Protected detail:
- NOT CUT OVER

Atlas:
- NOT CUT OVER

Codex:
- NOT CUT OVER
