# Portal Box Skeleton V1 — QA Freeze

Branch: `redesign/portal-box-skeleton-v1`  
PR: #121  
Verified commit: `205aad3753637f5ff9f45240ce4473397766476c`

## Gate results

- Production Readiness Gate: PASS
- Unified Shell QA: PASS
- Website Visual QA: PASS
- Horizontal overflow: none
- Skeleton design errors: none

## Frozen viewport matrix

| Viewport | Result | Overflow | Geometry errors |
|---|---|---|---|
| 1600×1000 | PASS | None | None |
| 1440×900 | PASS | None | None |
| 1200×900 | PASS | None | None |
| 1024×900 | PASS | None | None |
| 900×1100 | PASS | None | None |
| 768×1024 | PASS | None | None |
| 620×960 | PASS | None | None |
| 430×932 | PASS | None | None |
| 390×844 | PASS | None | None |

## Frozen geometry law

- Hero remains the largest box.
- WORLD remains dominant over CHARACTERS.
- Desktop primary rows use 58/42 at >=1200 and 56/44 at 901–1199.
- Status strip is 3-column above 900 and stacked at 900 and below.
- Primary portal rows stack at 900 and below.
- Secondary row is 3-column above 900, 2-column at 621–900, and 1-column at 620 and below.
- Discovery is 3-column above 900 and stacked at 900 and below.
- Community is 2-column above 900 and stacked at 900 and below.
- Placeholder text-safe and overlay-safe zones are present.
- Final background art is forbidden in the skeleton state.
- Final overlay art is forbidden in the skeleton state.

## Next phase

**BACKGROUND ART ONLY.**

Create backgrounds to the frozen box ratios and safe zones. Do not add foreground overlay assets or final wording until the background pass is approved.

## Non-blocking workflow note

GitHub Actions could not upload screenshot artifacts because Actions artifact storage is currently full. The render and layout checks completed successfully before the non-blocking upload step.
