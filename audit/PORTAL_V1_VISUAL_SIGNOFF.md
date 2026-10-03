# GENESIS World Portal V1 — Visual Sign-off Sheet

Branch: `redesign/genesis-world-portal-v1`  
PR: #119  
Status: **QA PASS — AWAITING COMMANDER VISUAL APPROVAL / MERGE AUTHORIZATION**

## Gate summary

| Gate | Current result | Required for sign-off |
|---|---|---|
| Production Readiness Gate | PASS | PASS |
| Unified Shell QA | PASS | PASS |
| Portal V1 Visual QA | PASS | PASS |
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
| WORLD overlay | Character must physically break the frame | PASS |
| Desktop meaningful text | No important text under 9px | PASS |
| Horizontal overflow | None | PASS |
| Missing assets / 404 | None | PASS |

## Mobile sign-off — 430×932 and 390×844

| Check | Requirement | Current |
|---|---|---|
| Hero | ≥460px | PASS |
| WORLD | Near full-width | PASS |
| Cards | Must stay inside viewport | PASS |
| WORLD overlay | Must not escape right viewport | PASS |
| Character-over-frame effect | Visible without clipping | PASS |
| Touch targets | Clickable CTAs ≥40px; status links ≥44px target after repair | PASS |
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



## Final repaired QA result

Verified commit: `817fd7686e466be37994cb891b0f5cf3204c9f95`

| Viewport | Visual QA | Horizontal overflow | Design errors |
|---|---|---|---|
| Desktop 1440×900 | PASS | None | None |
| Desktop 1600×1000 | PASS | None | None |
| Tablet 768×1024 | PASS | None | None |
| Mobile 430×932 | PASS | None | None |
| Mobile 390×844 | PASS | None | None |

Production Readiness: **PASS**  
Unified Shell QA: **PASS**  
Website Visual QA: **PASS**

### Non-blocking workflow note

GitHub Actions could not upload the rendered screenshot artifact because the repository artifact-storage quota is currently full. The screenshot render step itself completed successfully and the Portal V1 visual checks passed. Artifact upload is configured non-blocking and did not affect the QA result.

## Promotion status

The redesign remains isolated on `redesign/genesis-world-portal-v1` and PR #119 remains a draft comparison PR.

**Technical sign-off: PASS**  
**Visual/Commander sign-off: PENDING**  
**Live deployment: NOT AUTHORIZED**
