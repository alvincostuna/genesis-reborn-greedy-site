# Portal Overlay Pass V1 — Contract

Background authority: `audit/PORTAL_BACKGROUND_PASS_V1_FREEZE.md`

## Non-negotiable freeze

Overlay Pass V1 MUST NOT change:

- Frozen box geometry
- Batch 1 background files
- Approved background-position rules
- Approved Hero mobile gradient/crop
- Characters contrast repair
- Support contrast repair
- Continue Story V2 background
- Shared top navigation shell

Overlay Pass V1 is foreground art only.

## Overlay architecture

Every overlay is a separate transparent WebP or PNG layer placed above the frozen background and below future final wording.

Layer order:

1. Frozen background
2. Readability gradient already approved
3. Transparent overlay art
4. Future wording / buttons / runtime data

No wording may be baked into any overlay asset.

## V1 overlay map

| Section | Overlay subject | Placement | Frame behavior | Priority |
| --- | --- | --- | --- | --- |
| HERO | Flavio-style lead adventurer, seated/leaning traveler silhouette with forge/adventure cues | right 33–38% | may break top/right/bottom slightly | P0 |
| WORLD | Traveler/explorer with map, pack, or compass | top-right | modest frame breakout | P0 |
| CHARACTERS | Two distinct companion silhouettes / social duo | upper-left + upper-right | may break top slightly | P0 |
| MONSTERS | Large dragon/monster head or upper body | upper-right/right edge | strong controlled breakout | P0 |
| CODEX | Open tome / arcane book / floating pages | lower-right | contained, no human | P1 |
| ITEMS | Forged weapon / hammer / rare equipment | diagonal lower-right or right edge | contained except small edge breakout | P1 |
| CONTINUE STORY | Lone traveler/protagonist from behind, moving toward destination | right/bottom | modest breakout | P1 |
| MANGA | Manga page stack / sketch sheet / illustrator tool bundle | upper-right | contained | P2 |
| SUPPORT | Friendly guild attendant / helper NPC | upper-right | modest breakout | P1 |
| COMMUNITY | Cheerful adventurer/community host | upper-right | modest breakout | P1 |

## Explicitly no overlay in V1

- Next Release
- Continue Reading status cell
- Reader Profile status cell
- Featured Region
- Featured Monster
- Featured Item
- Support & Fan Page
- Footer

Those remain background/status-driven until Batch 2 is complete.

## Asset requirements

- Transparent background
- No baked wording
- No logos
- No UI borders
- No rectangular matte
- No scenery duplicated from the background
- Subject must remain readable at the target card size
- Lighting direction must plausibly match the assigned background
- Use restrained rim light so the cutout remains legible without looking pasted on
- No duplicated character pose between boxes
- No cloned face/pose reused across portal cards
- No subject should cover more than ~42% of its box on desktop unless Hero/Monster
- Hero maximum visual footprint: ~38% width desktop
- Mobile overlay may reduce in scale or shift position independently

## Safe-zone law

Overlay art must not cover the frozen text-safe zone.

- HERO: keep left 40% clear
- WORLD: keep left 45% clear
- CHARACTERS: keep lower-left wording zone clear
- MONSTERS: keep lower-left clear
- CODEX: keep left 45% clear
- ITEMS: keep left/bottom clear
- CONTINUE STORY: keep left 42% clear
- MANGA: keep left/bottom clear
- SUPPORT: keep left/bottom clear
- COMMUNITY: keep left 50% clear

## Responsive law

At >= 901px:
- overlays use desktop placement
- controlled frame breakout is allowed only where specified

At 621–900px:
- overlays scale down
- no overlay may create horizontal overflow
- text-safe zones remain authoritative

At <= 620px:
- overlays may be reduced to ~55–75% of desktop relative scale
- subject head/face must remain visible
- subject cannot cover the text-safe zone
- no overlay may force a taller box

## Overlay QA gates

For every frozen viewport:
- 1600
- 1440
- 1200
- 1024
- 900
- 768
- 620
- 430
- 390

Verify:

- zero horizontal overflow
- frozen box heights unchanged
- background file references unchanged
- overlay file exists and returns 200
- overlay is transparent
- overlay does not obscure text-safe zone
- overlay does not escape more than the allowed breakout
- no duplicated overlay asset
- no final wording introduced
- no overlay appears in Batch 2-only boxes
- no page-specific header regression

## Production order

1. HERO
2. WORLD
3. CHARACTERS
4. MONSTERS
5. CODEX
6. ITEMS
7. CONTINUE STORY
8. SUPPORT
9. COMMUNITY
10. MANGA

The first four overlays form **Overlay Batch 1A** and must be visually approved before the remaining six are generated.
