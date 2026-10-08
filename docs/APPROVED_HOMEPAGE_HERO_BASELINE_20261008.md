# GENESIS Official Homepage — Commander-Approved Hero Baseline

Approved: 2026-10-08 (Asia/Manila).
Baseline source commit: `1773992e9a87a52c9aeb40d9a9603fce621b0766` (merged PR #187).
Status: Official deployment SUCCESS; Production Readiness, Website Visual QA, and Unified Shell QA SUCCESS on that SHA.

## Frozen visual contract
- Preserve the approved sunset fantasy-city background artwork and top navigation.
- Preserve the transparent GENESIS logo + release-clock decorative overlay.
- Preserve the independent transparent Flavio foreground artwork, moved left so his windblown cape intentionally overlaps a small portion of the right side of the clock frame.
- Preserve image layering: background, clock/logo overlay, then Flavio foreground; keep the existing soft natural shadow.
- Preserve live countdown digits and the functional READ NOW link; character image must not intercept pointer events.
- Do not restore the removed redundant Story / World / Community / Support hero shortcut row.
- Keep desktop and mobile responsive behavior; mobile navigation remains accessible.

## Scope lock
Hero is APPROVED. Future changes must be surgical, expressly requested, and checked against this baseline. No visual redesign or new artwork without Commander instruction. Do not revert the visual baseline to older V4/V5 style overrides.

## Recovery/rollback reference
For visual comparison use PR #187 and source commit `1773992e9a87a52c9aeb40d9a9603fce621b0766`. This file is documentary only and does not modify runtime behavior. Production deploy run: https://github.com/alvincostuna/genesis-reborn-greedy-site/actions/runs/37776003581 .
