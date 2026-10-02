# GENESIS WEB-DS V3.0 — Visual QA Checklist

Status: **LOCKED REFERENCE**
Scope: Official public website, desktop and mobile.
Live visual baseline: `efca24071d7066017c814db7ad3289618f8a0be0`

## Purpose

This checklist protects the approved GENESIS visual language from drifting back toward generic SaaS/game-dashboard styling. It is a visual-language contract, not a layout redesign brief.

The reference identity is:

> Dark-fantasy literary HUD with midnight navy surfaces, antique-gold structure, ivory/silver typography, restrained arcane-blue illumination, and rare GREEDY-red accents.

## Non-negotiable preservation rules

- Do not alter the cinematic hero composition or locked hero asset.
- Do not change command-deck width/ratio/placement unless a separately approved geometry revision exists.
- Do not change database, publication, account, reward, or production behavior as part of visual polish.
- Do not add blocking external font dependencies.
- Do not add decorative raster assets larger than 500 KB.
- Do not reintroduce multi-megabyte PNG artwork into the command deck.
- Do not weaken spoiler/publication gates for the sake of richer visuals.
- Mobile must remain the same design family as desktop.

## Desktop acceptance viewports

Required:
- 1440 × 900
- 1600 × 1000

The 1600px viewport is mandatory because it catches hero/deck proportional drift that can be hidden at 1440px.

### Desktop geometry

PASS only when:
- Deck left edge matches hero left edge within ±2 px.
- Deck right edge matches hero right edge within ±2 px.
- Deck width matches hero width within ±2 px.
- Desktop deck ratio remains approximately 2.8:1 within ±3 px height tolerance.
- Upper-panel gaps remain 10 ±2 px.
- Lower-panel gap remains 10 ±2 px.
- Currently Reading remains the largest upper panel.
- No hero overlap occurs.
- No horizontal overflow occurs.
- No clipped title, button, timer, or artwork occurs.

## Mobile acceptance viewports

Required:
- 390px wide
- 430px wide

PASS only when:
- Fixed mobile navigation remains readable and unobtrusive.
- Primary touch targets are at least 44px high.
- Bottom-safe-area clearance prevents content from becoming inaccessible.
- Command deck stacks without horizontal overflow.
- Currently Reading does not retain a desktop-sized empty cavity.
- Panel headers remain readable at 13px.
- Featured story title remains readable at 24px.
- Meaningful metadata never falls below 10px.
- Ornament scale is reduced relative to desktop.
- No desktop-only side-by-side dependency is required to understand the page.

## Typography contract

### Display / ceremonial labels
Stack:
`"Cinzel", Georgia, "Times New Roman", serif`

Use for:
- panel headings
- release-cycle title
- schedule values
- button labels
- small ceremonial plaques

Desktop panel heading:
- 15px
- 600 weight
- small-caps
- 0.055em tracking

Mobile panel heading:
- 13px

### Literary / story titles
Stack:
`"Cormorant Garamond", Georgia, "Times New Roman", serif`

Use for:
- Currently Reading title
- Reader identity title
- release-card titles
- pre-launch archive title

Desktop story title:
- 28px
- 600 weight

Mobile story title:
- 24px

### Utility text
Stack:
`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`

Use for:
- body copy
- metadata
- countdown labels
- stats
- technical utility text

Rules:
- Body/UI text target: 11–13px.
- Meaningful text must never render below 10px.
- Decorative serif fonts must not be used for dense paragraph text.

## Color hierarchy

Primary structural accent:
- Antique gold `#D5AE58`

Ceremonial highlight:
- Bright gold `#F0D488`

Major title:
- Ivory `#F2EEE5`

Secondary text:
- Silver `#CBD3DA`

Muted metadata:
- Steel `#899BAA`

Secondary magical illumination:
- Arcane blue `#5EA7D9`
- Blue highlight `#8BD5FF`

Rare narrative accent:
- GREEDY red `#A92521`
- Bright red `#D04238`

FAIL when:
- Bright blue becomes the dominant CTA language.
- Cyan/neon dominates panel borders.
- Red becomes a normal UI accent.
- Gold is no longer the primary structural highlight.
- Ivory/silver hierarchy is replaced by generic white/gray everywhere.

## GREEDY-red restraint rule

Red is intentionally rare.

Approved uses:
- one thin story accent
- exceptional warning/danger state
- rare narrative selection
- destructive action

Do not use red for:
- ordinary borders
- all active tabs
- standard buttons
- countdown boxes
- common headings

Visual rule of thumb: red should occupy no more than about 5% of the visible interface.

## Panel treatment

PASS only when:
- panel background remains midnight/navy rather than flat black or saturated blue
- main border reads as antique gold
- inner line remains subtle steel/arcane blue
- corner ornaments look engraved, not neon
- shadowing adds depth without glowing like a sci-fi HUD
- headers feel literary/ceremonial rather than like generic card labels

## Primary CTA

Approved language:
- dark ceremonial navy surface
- antique-gold border
- ivory text
- subtle gold inner highlight

FAIL when:
- primary CTA returns to saturated app-blue
- CTA requires a raster background
- CTA becomes brighter than the logo/hero focal point

Minimum target:
- 46px desktop
- 44px mobile

## Secondary CTA

Approved language:
- dark translucent surface
- silver text
- muted steel border
- gold hover treatment

FAIL when:
- secondary CTA competes visually with primary CTA
- secondary CTA uses strong neon blue fill

## Official Release Cycle

PASS when:
- release heading reads as ceremonial gold
- schedule line is large, gold, and authoritative
- countdown digits may use arcane blue
- countdown box is dark navy, not bright-blue app UI
- daily release slots use restrained gold typography
- supporting text remains silver/steel

## Currently Reading

This is the primary narrative panel.

PASS when:
- it carries more story emphasis than Release Cycle or Your Access
- story title is the strongest literary serif in the deck
- image reads like a framed illustration
- primary CTA is visually premium but not brighter than the hero
- pre-launch state still looks intentional and complete

## Your Access

PASS when:
- reader emblem reads like a crest/seal
- GENESIS Reader title uses literary serif
- Reader Account chip reads like a small gold plaque
- stat rows use separators rather than excessive boxed-form styling
- unsigned state still looks intentional, not disabled/broken

## Latest Releases / Announcements

PASS when:
- section headers use the same ceremonial heading language
- release-card titles use literary serif
- metadata remains muted steel
- hover is gold-led, not blue-led
- empty archive state fills the available area intentionally
- announcements resemble a chronicle/bulletin, not an admin log

## Empty-state quality

Every empty state should contain:
- one clear heading
- one short explanation
- one useful action when appropriate
- purposeful spacing
- no stranded one-line error card inside a large empty panel

Public-facing copy must not expose internal Builder terms such as:
- Final Canon
- production database
- Supabase projection
- executed reader-safe reveal
- runtime gate
- canonical rules

Admin may use internal/system terminology.

## Performance guard

PASS only when:
- command-deck active artwork uses optimized WebP
- V3 theme introduces no image/font asset URL
- no decorative asset added by the theme exceeds 500 KB
- hero preload remains present
- Supabase preconnect remains present
- existing homepage payload guard passes
- no animated particle canvas is introduced

## Accessibility / interaction

PASS only when:
- visible focus state remains present
- button text contrast stays readable
- mobile fixed navigation does not trap/invalidate bottom content
- current-page mobile tab keeps semantic current-page marking
- links/buttons remain keyboard reachable
- touch targets meet minimum size

## Required automated gates

Before merge:
- GENESIS Website Visual QA — PASS
- GENESIS Unified Shell QA — PASS
- GENESIS Production Readiness Gate — PASS

Before production promotion:
- exact-SHA gate — PASS
- public-only package verification — PASS
- locked hero asset hash — PASS
- candidate route checks — PASS
- /admin/ remains private — PASS
- CSP — PASS
- HSTS — PASS

## Required manual RED TEAM inspection

Automated PASS is not sufficient for a major visual-language change.

Manually inspect at least:
- Home 1600 desktop
- Home 390 mobile
- one secondary page desktop
- one secondary page mobile

Ask:
1. Does the interface still look like GENESIS if the logo is temporarily hidden?
2. When the logo is revealed again, does it look like the same art director designed both?
3. Did gold remain structural, blue remain secondary, and red remain rare?
4. Did any visual effect become more important than the story?
5. Did the change add weight without adding meaning?

Any “no” to questions 1–4 is a redesign failure even when automated QA passes.

## Final verdict format

Use:
- PASS — meets contract
- FAIL — blocks merge
- BLOCKED — cannot verify because data/environment unavailable
- DEFERRED — accepted non-blocking work for a later pass

Never call a major visual revision complete solely because workflows are green.
