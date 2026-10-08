# GENESIS Navigation & Destination Background Baseline — 2026-10-08

Pre-change main: `3d2d82b5f57451cfad447a8b75583fad3c391b96`.
Approved Home hero reference: `1773992e9a87a52c9aeb40d9a9603fce621b0766`.
Stage 1 feature lock: **no functionality removal, no backend changes, no Home hero changes**.

## Protected areas
- Home: hero backdrop, transparent Flavio, clock, release runtime, READ NOW, navigation.
- Read: episode navigation/list, reader preferences, progress, fullscreen, manuscript render.
- World: Atlas map/reveal state, fog-of-war and knowledge gates, filters and routes.
- Codex: categories, search, spoilers and reveal filters, data browser.
- Fan Page: reader-generated content, moderation/launch restrictions.
- Manga: coming-soon state, cross-page links.
- Support: tier offerings, disabled payment state, rewards, quest navigation.

## Stage 2
Align each destination's header markup with Home's actual header baseline, preserving each destination's active nav marker. No change to nav destinations, event handlers, or search/notification/account controls.

## Stage 3
Expose and align existing destination background artwork with *presentation-only CSS*. Do not replace or hide existing content and components. Read is kept deliberately compact to protect reading workflow.

## Acceptance
7 headers share the same non-active structure; active nav matches its page; all original IDs, scripts, route links and body sections preserved. Verify original World/Codex/Fan/Manga desktop and mobile background URLs stay intact, no Home CSS modifications; run existing CI QA. Roll back via pre-change SHA if needed.
