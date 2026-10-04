# Portal Background Integration — Batch 1

Status: **MAPPED / READY FOR ASSET UPLOAD**
Phase law: **BOXES -> BACKGROUNDS -> OVERLAYS -> WORDINGS**

No foreground overlays or final wording may be added during this phase.

## Batch 1 frozen mapping

| Frozen box | Approved source master | Website target | Text-safe / focal rule |
|---|---|---|---|
| HERO | golden_citadel_above_the_misty_kingdom.png | /assets/portal-v1/backgrounds/hero-desktop.webp | Dark/calm left 40%; citadel and sunrise center-right; right remains usable for later protagonist overlay |
| WORLD | celestial_citadel_over_misty_valleys.png | /assets/portal-v1/backgrounds/world-desktop.webp | Left 45% calm; world depth center/right; top-right remains readable for later traveler overlay |
| CHARACTERS | golden_lanterns_over_the_fantasy_harbor.png | /assets/portal-v1/backgrounds/characters-desktop.webp | Lower-left text-safe; warm social environment; upper area reserved for later character overlay |
| MONSTERS | infernal_fortress_over_a_ruined_valley.png | /assets/portal-v1/backgrounds/monsters-desktop.webp | Lower-left dark/calm; danger focal point right; top/right reserved for later monster breakout |
| CODEX | enchanted_cathedral_astral_library.png | /assets/portal-v1/backgrounds/codex-desktop.webp | Left text-safe; archive focal point center-right; bottom-right available for tome/prop overlay |
| ITEMS | cathedral_forge_overlooking_a_floating_citadel.png | /assets/portal-v1/backgrounds/items-desktop.webp | Left/bottom text-safe; forge focal point right; diagonal corner reserved for later weapon overlay |
| CONTINUE STORY | golden_citadel_beyond_the_mist.png | /assets/portal-v1/backgrounds/continue-story-desktop.webp | Left 42% calm; destination/sunset right; right/bottom reserved for later story-character overlay |
| MANGA | fantasy_artist_s_sunset_studio.png | /assets/portal-v1/backgrounds/manga-desktop.webp | Left/bottom text-safe; studio desk right; top-right reserved for later manga overlay |
| SUPPORT | luminous_fantasy_guild_hall_reception.png | /assets/portal-v1/backgrounds/support-desktop.webp | Left/bottom calm; reception focal point right; top-right reserved for later helper overlay |
| COMMUNITY | twilight_revelry_in_the_mountain_city.png | /assets/portal-v1/backgrounds/community-desktop.webp | Left 50% usable; celebration right; top-right reserved for later community character overlay |

## Optimized desktop exports

| Asset | Export resolution | Approx. WebP size |
|---|---:|---:|
| Hero | 1600x667 | 177 KB |
| World | 1200x552 | 153 KB |
| Characters | 900x571 | 160 KB |
| Monsters | 1200x455 | 110 KB |
| Codex | 900x471 | 95 KB |
| Items | 800x400 | 94 KB |
| Continue Story | 1600x373 | 108 KB |
| Manga | 800x400 | 92 KB |
| Support | 800x400 | 100 KB |
| Community | 1000x333 | 95 KB |

Total desktop Batch 1 payload is approximately **1.18 MB before browser cache/compression effects**.

## Live visual QA pass

Run after the 10 WebP files are present and CSS is bound.

### Viewports
- 1600x1000
- 1440x900
- 1200x900
- 1024x900
- 900x1100
- 768x1024
- 620x960
- 430x932
- 390x844

### Blocking checks
1. Every mapped background returns HTTP 200.
2. Every frozen box shows its unique assigned image; no duplicate asset paths.
3. No final overlay character/object assets are present.
4. No final wording treatment is introduced.
5. No horizontal overflow.
6. No section overlap.
7. Background uses normal cover/crop only; no excessive transform/zoom workaround.
8. Text-safe area retains usable contrast after a mild local gradient.
9. Primary focal point remains visible at 1600, 1440, 1200, and 1024.
10. At <=900, crop must preserve the subject and must not move the focal point underneath the future text zone.
11. WORLD remains visually dominant after Hero.
12. CHARACTERS and MONSTERS remain stronger than secondary portals.
13. Background brightness remains clear enough to read as artwork; do not globally crush to near-black.
14. No important face/monster/weapon is baked into a future overlay-safe zone.
15. Individual background payload target: normally <=200 KB desktop; flag >250 KB.
16. Batch 1 desktop aggregate target: <=1.5 MB.
17. Existing shared Home/Reader/World/Codex header parity remains unchanged.

### RED TEAM rejection conditions
- wrong image assigned to a box
- duplicated background between major boxes
- focal point lost through crop
- text-safe zone becomes visually busy
- generated art contains readable accidental wording/signage
- background contains an obvious foreground character that competes with the later overlay
- image looks stretched, soft, or visibly over-compressed
- page becomes significantly darker than the approved visual direction
- any background forces box geometry changes

## Promotion rule

Background Pass 1 can be frozen only after the ten assets are visible in the real frozen boxes and pass all nine viewports. **Do not start Overlay Pass V1 before that visual approval.**
