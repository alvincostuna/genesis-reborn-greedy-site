# GENESIS Website Asset Manifest

## MASTER_KEY_ART_SPLIT_WORLD_V1

**Status:** APPROVED / COMMANDER-LOCKED  
**Authority:** 036  
**Source supplied by Commander:** `flavio(2).png`  
**Source dimensions:** 1672 × 941  
**Source SHA-256:** `09b550897c8018f7b368f2e1ee0e38aedf9cc36bb060f2523c73e210aba1e4ef`

Visual lock:
- warm fantasy / reborn Flavio left;
- cyberpunk / exhausted older Flavio right;
- in-world billboard: **GENESIS / LIVE MORE.**;
- central light-novel title: **GENESIS REBORN GREEDY**;
- master tagline: **A SECOND LIFE. ONE FUTURE TO FORGE.**;
- diamond sigil preserved.

### Planned web derivative

Target path:
`public/site-preview/assets/master-key-art-split-world-v1.webp`

The web derivative must be produced from the approved source image. It must not be independently regenerated or artistically reinterpreted.

Current local optimized derivative prepared from the approved source:
- dimensions: 960 × 540
- SHA-256: `64c2fa7b46053c8ba468be5dbd7f58795624be92cdf71e0e53334f1d501dba25`

The preview must not be promoted as visually complete until this exact approved-source derivative is mounted at the target path.

## DIAMOND SIGIL

**Status:** PROTECTED BRAND ASSET / 036**

The compact Admin currently uses a clearly marked glyph placeholder only. The final favicon/header/icon should use the approved diamond artwork extracted or supplied from the protected brand asset, not a newly invented symbol.


## Protected preview mount — 2026-09-24

The protected preview now embeds exact derivatives of the approved Commander-supplied source. No generative redraw was used.

- Preview hero derivative: 640px-wide WEBP from `MASTER_KEY_ART_SPLIT_WORLD_V1.png`
- Preview hero SHA-256: `599158bfd97dc21a59261ec84303a73f35c2f8141356774d3d564618f6ce8301`
- Preview small sigil derivative: exact crop from the central approved white diamond sigil, 128×128 WEBP
- Preview sigil SHA-256: `6caff1ac994b6d7847070a32effbdde3940c2b22917b98e16c4b802349ec4762`
- Mount mode: embedded data assets in protected preview/Admin HTML
- Public live site: unchanged
- Future production optimization may replace embedded preview data with static binary files only if hashes/source provenance remain traceable to the approved master.


## OFFICIAL GENESIS LOGO — SHINY CHROME V1

**Status:** APPROVED / COMMANDER-LOCKED / PERMANENT BRAND MARK  
**Authority:** 036  
**Locked date:** 2026-09-24

The Commander selected the transparent shiny pearl-chrome diamond sigil as the official GENESIS logo.

Master source:
- dimensions: 1254 × 1254
- transparent PNG
- SHA-256: `cf5f49909def9d4c84fc90827485e89c16f70655cefffb7a12fa2c3f5a4eedb8`

Website derivatives:
- `public/assets/genesis-official-logo.png` — 128 × 128 PNG
- SHA-256: `893db0d3b6a778a9abf6e29003866b517b690709310b8eef07ae00363e72e649`
- `public/assets/genesis-official-logo-64.png` — 64 × 64 PNG
- SHA-256: `b33ac1886e7c7808dacc0117679a6c69d7425fdf699f8a8cc6fa48d97b021eee`

Usage lock:
- reader navigation;
- Admin Control Center;
- favicon/tab icon;
- Manga coming-soon identity;
- future compact GENESIS brand placements.

Presentation rules:
- transparent background;
- preserve full four-point silhouette;
- center horizontally and vertically;
- never crop the lower tip;
- keep comfortable clear space around every point;
- preserve the shiny pearl/chrome white body and subtle cool-blue luminous highlights;
- do not revert to the former black-tile crop or the old key-art-extracted sigil.

The earlier preview crop is **SUPERSEDED for standalone logo use**. It may remain inside the approved master key art as part of that artwork.

## HOMEPAGE GENESIS CYCLE

The reader Home remains key-art-first. A compact **GENESIS CYCLE** overlay is permitted on Home as the only operational information element.

It uses the canonical 8-hour cycle from Supabase and displays:
- live countdown to the next cycle;
- next cycle time in Asia/Manila;
- 8-hour cycle identity.

It must remain visually secondary to the approved key art and must not become a stacked homepage panel.


## LIVE HERO FIX — 2026-09-24

**Status:** DEPLOYED SOURCE FIX / LOCKED-ASSET PRESERVATION

The approved split-world key art is mounted as a real static binary asset instead of relying on an embedded data URI:

- Path: `public/assets/master-key-art-split-world-v1.webp`
- Source: exact previously embedded approved preview derivative
- No regeneration or reinterpretation
- Live reader build must copy this asset into `.live-assets/assets/`
- Home must reference `/assets/master-key-art-split-world-v1.webp`

Reader header branding must display the complete canonical title:
**GENESIS: REBORN GREEDY**

A syntax defect caused by an accidental literal `\\n` in `site.js` was corrected so the GENESIS CYCLE initializes normally.
