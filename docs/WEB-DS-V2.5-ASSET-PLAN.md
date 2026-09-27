# WEB-DS-V2.5 Asset Plan

Status: DESIGN ASSET PREPARATION
Branch: web-ds-v2-5-assets
Base: WEB-DS-V2.4 render checkpoint
Scope: visual assets and presentation only

## Priority order

### P0 — Hero composition
Create one primary cinematic Home hero designed specifically for the website rather than reusing the split-world art.

Required desktop composition:
- central dark-haired male lead as the focal subject
- two supporting fantasy characters creating left/right balance
- distant fantasy city/castle/world depth
- dark blue / midnight environment with warm gold light accents
- open negative space at lower-left for the GENESIS wordmark and CTA text
- readable crop at 16:6 / ultrawide desktop ratios
- no text embedded in the artwork

Required mobile companion crop:
- same art direction
- central hero survives 9:16 / portrait crop
- supporting characters remain partially visible
- upper area remains clean enough for mobile branding/navigation
- no embedded text

Target files:
- public/assets/v25/hero-home-desktop.webp
- public/assets/v25/hero-home-mobile.webp

### P0 — Brand lockup
Improve visual authority of the top-left and hero branding without changing the project title.

Target files:
- public/assets/v25/genesis-brand-lockup.svg
- public/assets/v25/genesis-mark.svg

Requirements:
- strong gold/ivory contrast
- legible at 180–320 px display widths
- transparent background
- no rasterized tiny lettering

### P1 — Navigation / HUD icon set
Replace placeholder Unicode glyphs with one coherent icon family.

Required icons:
- home
- read/book
- world/compass
- codex/book-rune
- fan/community
- manga/panel
- support/heart-shield
- notification/bell
- search
- profile
- hourglass/release
- sunrise
- moon
- advance access
- support unlock
- social unlock
- quest
- collectible

Target:
- one SVG sprite or individual SVGs under public/assets/v25/icons/
- consistent 24×24 viewbox and 1.5–2 px visual stroke weight
- gold active state, pale-blue inactive state

### P1 — Latest Release art set
Stop reusing one key-art crop for all release cards.

Create three reusable release-art archetypes:
1. character / confrontation
2. city / exploration
3. dungeon / mystery

Target files:
- public/assets/v25/release-character.webp
- public/assets/v25/release-city.webp
- public/assets/v25/release-mystery.webp

These are presentation assets only; actual Episode/Part/title/date remain data-driven.

### P1 — Destination card art
Provide distinct images for:
- World
- Codex
- Fan Page
- Manga
- Support

Target files:
- public/assets/v25/card-world.webp
- public/assets/v25/card-codex.webp
- public/assets/v25/card-fan.webp
- public/assets/v25/card-manga.webp
- public/assets/v25/card-support.webp

Visual direction:
- World: expansive landscape / city / map scale
- Codex: desk, tome, diagrams, relics
- Fan Page: adventurer/community gathering
- Manga: monochrome or inked illustrated panel treatment
- Support: forge/workshop/warm patron scene

### P2 — Ornamental UI kit
Create reusable frame pieces rather than adding more bespoke CSS.

Target assets:
- corner-gold.svg
- divider-gold.svg
- medallion-ring.svg
- panel-rune.svg
- glow-rune.svg

Use:
- panel corners
- release HUD
- section separators
- profile medallion
- hero frame accents

## Implementation sequence

1. Generate/approve hero desktop + mobile art.
2. Replace header/hero lockup.
3. Replace navigation glyphs with SVG icon set.
4. Add three release-card artworks.
5. Add five destination-card artworks.
6. Add ornamental SVG kit.
7. Re-run rendered QA at 1440×1100 and 390×844.
8. Compare against the approved reference before merge.
9. Merge only after no overflow, no console errors, and visual review passes.

## Non-goals / protected behavior

Do not change:
- public route structure
- Supabase/API contracts
- release chronology
- account/access calculations
- payment/share activation state
- AI-2 production
- manuscripts
- security headers
- Cloudflare deployment safeguards

## V2.5 success criteria

V2.5 is successful when:
- the hero no longer looks like reused banner art
- header branding is visually dominant
- no placeholder Unicode navigation icons remain
- Latest Releases no longer share the same visual crop
- World/Codex/Fan/Manga/Support each have distinct artwork
- mobile composition looks authored, not merely responsive
- visual QA passes on desktop and mobile


## Asset intake — 2026-09-27

Accepted for V2.5:
- hero-home-desktop.webp — user-supplied, 2048 × 768, correct ~2.66:1 ratio, composition accepted
- hero-home-mobile.webp — user-supplied, 1080 × 1440, exact mobile target, composition accepted
- 19-icon SVG family — imported into public/assets/v25/icons/ and wired into the Home UI

Hero visual acceptance:
- central dark-haired protagonist is dominant
- two supporting characters provide ensemble balance
- castle/city depth is strong
- dark left-side desktop negative space supports wordmark/CTA overlay
- mobile crop retains protagonist and supporting cast
- no baked website text or watermark

Current repository state:
- SVG icon set: INTEGRATED
- icon CSS mask/currentColor states: INTEGRATED
- guarded live asset packaging for public/assets/v25: PREPARED
- hero binary artwork: ACCEPTED, PENDING REPOSITORY BINARY IMPORT
- rendered QA for icon integration: RUNNING
