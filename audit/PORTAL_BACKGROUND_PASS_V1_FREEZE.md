# Portal Background Pass V1 — Freeze

Frozen production commit: `1f7f79225c2c4b63e4249a174e3e1ea0ffc30502`

## Frozen Batch 1 backgrounds

- Hero: `hero-desktop.webp`
- World: `world-desktop.webp`
- Characters: `characters-desktop.webp`
- Monsters: `monsters-desktop.webp`
- Codex: `codex-desktop.webp`
- Items: `items-desktop.webp`
- Continue Story: `continue-story-v2.webp`
- Manga: `manga-desktop.webp`
- Support: `support-desktop.webp`
- Community: `community-desktop.webp`

Location:
`public/assets/portal-v1/backgrounds/batch1/`

## RED TEAM repair locks

- Hero mobile keeps the stronger left-side gradient and safer rightward crop.
- Characters keeps the stronger left/lower-left text-safe gradient and rightward focal shift.
- Support keeps the stronger left-side contrast protection and rightward focal shift.
- Continue Story V2 remains the distinct journey composition; do not revert to the earlier citadel-style background.

## Background-pass law

- Backgrounds only.
- No foreground overlay character/monster/item art in this freeze.
- No final wording or polished CTA layer in this freeze.
- No duplicate background assets between the ten Batch 1 boxes.
- Batch 2 boxes remain neutral until their own background pass is approved.
- Do not alter frozen box geometry to compensate for artwork.
- Use normal `cover` behavior and the approved background-position rules; do not add aggressive CSS zoom.

## Verification

Post-merge production checks for `1f7f79225c2c4b63e4249a174e3e1ea0ffc30502`:

- Auto Deploy GENESIS Official Website: PASS
- Production Readiness Gate: PASS
- Unified Shell QA: PASS
- Website Visual QA: PASS

Nine frozen viewport modes reported zero layout/design errors and no horizontal overflow:

- 1600
- 1440
- 1200
- 1024
- 900
- 768
- 620
- 430
- 390

GitHub screenshot artifact upload remains non-blocking because the repository Actions artifact storage quota is full.

## Next phase

Overlay Pass V1 may begin only as a separate foreground layer. Background V1 is frozen and should not be mutated while overlay assets are developed except for a verified regression repair.
