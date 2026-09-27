# WEB-DS-V2.5 Asset Specifications

Status: READY FOR ASSET PRODUCTION
Branch: web-ds-v2-5-assets
Purpose: visual asset production only

## 1. Production priority

### Wave A — Highest visual impact
1. Home hero desktop
2. Home hero mobile
3. GENESIS brand lockup
4. Core nav icon set

Reason: these four assets control the first 2–3 seconds of visual perception on both desktop and mobile.

### Wave B — Content richness
5. Latest Release: character/confrontation
6. Latest Release: city/exploration
7. Latest Release: dungeon/mystery
8. World card
9. Codex card
10. Fan Page card
11. Manga card
12. Support card

Reason: these remove the repeated-art problem and make the lower half of the Home page feel authored.

### Wave C — Premium HUD finish
13. Gold corner ornament
14. Gold divider
15. Profile medallion ring
16. Panel rune
17. Glow rune
18. Secondary HUD icons

Reason: these improve premium finish after the major imagery is solved.

## 2. Hero desktop specification

File:
public/assets/v25/hero-home-desktop.webp

Canvas:
- preferred: 2560 × 960
- acceptable minimum: 1920 × 720
- target ratio: ~2.66:1
- output: WebP, high quality, optimized for web
- no text embedded

Composition:
- one dark-haired male protagonist is the strongest focal point
- protagonist occupies center / center-right
- two supporting fantasy characters frame him without competing
- fantasy city, fortress, or grand world architecture creates depth
- clear foreground / midground / background separation
- left-lower quadrant remains lower-detail for website wordmark and CTA
- right side may carry secondary environmental storytelling
- keep important faces inside central 70% safe area

Palette:
- midnight navy / black-blue base
- luminous cobalt and cyan accents
- warm gold / amber rim light
- restrained crimson only as an accent
- avoid bright white backgrounds

Lighting:
- cinematic backlight
- gold rim on armor/hair edges
- cool blue environmental light
- high local contrast around protagonist face and torso
- darker edges to support text overlay

Mood:
- dark fantasy MMORPG
- premium light-novel cover
- serious, ambitious, mysterious
- not grimdark horror
- not generic mobile-gacha splash art

## 3. Hero mobile specification

File:
public/assets/v25/hero-home-mobile.webp

Canvas:
- preferred: 1080 × 1440
- acceptable: 900 × 1200
- ratio: 3:4
- output: WebP
- no embedded text

Composition:
- protagonist centered in upper-middle
- head and torso remain visible after 9:16 / narrow-device cropping
- supporting characters can appear as partial side figures
- upper 20% must remain calmer for mobile navigation/logo
- lower 25% may be darker for release card overlap / transition
- do not rely on desktop crop alone

## 4. Brand lockup

Primary:
public/assets/v25/genesis-brand-lockup.svg

Secondary mark:
public/assets/v25/genesis-mark.svg

Requirements:
- transparent SVG
- readable from ~160 px to 460 px wide
- ivory/gold main lettering
- subtle blue highlight acceptable
- avoid ultra-thin strokes below 1.5 px at 200 px display width
- include clean silhouette so it remains readable over complex art
- no raster image embedded inside SVG

Lockup text:
GENESIS
REBORN GREEDY

Use:
- desktop nav
- mobile nav
- hero
- social/metadata cards later

## 5. Core navigation icon set

Directory:
public/assets/v25/icons/

Format:
- SVG
- 24 × 24 viewBox
- monochrome paths so CSS can recolor
- stroke or filled style must be consistent
- no Unicode glyph dependence

Required first wave:
- home.svg
- read.svg
- world.svg
- codex.svg
- fan.svg
- manga.svg
- support.svg
- search.svg
- bell.svg
- profile.svg

Required HUD wave:
- release.svg
- sunrise.svg
- moon.svg
- access.svg
- support-unlock.svg
- social.svg
- quest.svg
- collectible.svg
- arrow-right.svg

State styling:
- inactive: pale blue / ice white
- active: gold
- notification: red accent may be CSS overlay, not baked into icon

## 6. Latest Release artwork

Files:
public/assets/v25/release-character.webp
public/assets/v25/release-city.webp
public/assets/v25/release-mystery.webp

Canvas:
- 960 × 640 preferred
- 3:2 ratio
- WebP

Visual roles:
- character: confrontation / party / dramatic faceoff
- city: travel / city / kingdom / discovery
- mystery: ruin / dungeon / tablet / ancient chamber

Rules:
- no episode numbers or titles baked in
- leave some darker area for overlaid text
- each image must be clearly distinct at thumbnail size

## 7. Destination cards

Canvas:
- preferred 1200 × 720
- 5:3 ratio
- WebP
- strong crop at ~300 × 150 display size

Files and direction:
- card-world.webp — sweeping world/city/continent scale
- card-codex.webp — arcane desk, tome, diagrams, relics
- card-fan.webp — party/community/adventurer gathering
- card-manga.webp — inked / monochrome illustrated battle or character panel
- card-support.webp — forge/workshop/warm guild patron scene

Rules:
- no embedded labels
- preserve dark lower third for card title
- distinct silhouette per card
- no repeated crop from hero

## 8. Ornamental UI kit

Files:
- corner-gold.svg
- divider-gold.svg
- medallion-ring.svg
- panel-rune.svg
- glow-rune.svg

Style:
- antique gold with minimal gradients
- thin enough to remain elegant
- readable on dark navy
- symmetric where appropriate
- transparent SVG

Safe sizes:
- corner-gold.svg: 96 × 96
- divider-gold.svg: 640 × 24
- medallion-ring.svg: 128 × 128
- panel-rune.svg: 64 × 64
- glow-rune.svg: 96 × 96

## 9. Asset acceptance checklist

Each asset must pass:
- no text baked into imagery unless it is the brand SVG itself
- no watermark
- no unrelated logos
- no clipped primary face
- no unreadable details at target size
- no horizontal scroll introduced
- no layout-specific hardcoded text inside raster art
- file dimensions verified
- file size practical for web delivery
- renders cleanly at desktop and mobile QA viewports

## 10. Integration order

1. integrate desktop/mobile hero
2. integrate new brand lockup
3. swap nav glyphs for SVG icons
4. integrate latest-release art set
5. integrate five destination-card images
6. integrate ornaments
7. run full visual QA
8. compare against reference
9. only then merge into main

## Protected systems
V2.5 must not change:
- backend APIs
- Supabase contracts
- release scheduling
- payment/share reward activation
- AI-2
- manuscripts
- production data
- security headers
- Cloudflare deployment safeguards
