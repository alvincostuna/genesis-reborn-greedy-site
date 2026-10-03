# GENESIS World Portal V1 — Visual Sign-off Sheet

Branch: `redesign/genesis-world-portal-v1`  
PR: #119  
Status: **NOT APPROVED FOR MERGE — QA IN PROGRESS**

## Gate summary

| Gate | Current result | Required for sign-off |
|---|---|---|
| Production Readiness Gate | PASS | PASS |
| Unified Shell QA | PASS | PASS |
| Portal V1 Visual QA | FAIL → repair pass 1 committed | PASS |
| Live site mutation | NONE | Must remain NONE until approval |

## Desktop sign-off — 1440×900 and 1600×1000

| Check | Requirement | Current |
|---|---|---|
| Portal hierarchy | Hero → status strip → primary portals → secondary portals → story → discovery → community | PASS |
| Legacy dashboard removed | No Command Deck / no 9-tile World Navigation Hub | PASS |
| Hero scale | ≥450px high and ≥1100px wide | PASS |
| WORLD dominance | Wider than CHARACTERS; ≥330px high | PASS |
| Supporting portals | CHARACTERS / MONSTERS / CODEX ≥250px high | PASS |
| Story banner | ≥320px high | PASS |
| Hero title | ≥54px | PASS |
| WORLD title | ≥30px | PASS |
| Reader strip text | Primary text ≥17px | PASS |
| WORLD overlay | Character must physically break the frame | **REPAIR 1** |
| Desktop meaningful text | No important text under 9px | PASS |
| Horizontal overflow | None | PASS |
| Missing assets / 404 | None | **REPAIR 1** |

## Mobile sign-off — 430×932 and 390×844

| Check | Requirement | Current |
|---|---|---|
| Hero | ≥460px | PASS |
| WORLD | Near full-width | PASS |
| Cards | Must stay inside viewport | PASS |
| WORLD overlay | Must not escape right viewport | PASS |
| Character-over-frame effect | Visible without clipping | **REPAIR 1** |
| Touch targets | Clickable CTAs ≥40px; status links ≥44px target after repair | **REPAIR 1** |
| Horizontal overflow | None | PASS |
| Mobile stacking | No desktop squeeze-down | PASS |

## First Portal V1 findings

1. WORLD overlay was positioned inside the card instead of protruding above it.
2. `/assets/dashboard-v1/support-tile-desktop.webp` returned 404; canonical tile-support assets are used in Repair 1.
3. Original touch-target test incorrectly measured the inner label of linked portal cards. Repair 1 measures the clickable card itself and expands status-link targets.

## Sign-off rule

Portal V1 may not be promoted from draft or merged into `main` until:

- Production Readiness = PASS
- Unified Shell = PASS
- Portal V1 Visual QA = PASS at 1440, 1600, 768, 430, and 390 widths
- no horizontal overflow
- no missing visual assets
- WORLD character-over-frame effect passes
- desktop and mobile screenshots are visually reviewed
- Commander approves promotion

