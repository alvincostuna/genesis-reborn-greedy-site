# WEB-DS-V2.7 — Reward Catalog Batch 001

Status: DEFINED / NOT APPLIED TO PRODUCTION
Tier threshold: 1,000 Reader EXP
Reward cadence: 1 Tier + 1 random spoiler-safe draw per 1,000 EXP

## Batch goals

Batch 001 gives new readers enough visual variety that early Tier-ups feel rewarding without exposing unrevealed canon.

The batch deliberately mixes:
- collectible picture cards
- character art
- monster art
- desktop wallpapers
- mobile wallpapers
- backgrounds
- one special-art slot

## Catalog

| Key | Type | Title | Rarity | Min Episode | Asset path |
| --- | --- | --- | --- | ---: | --- |
| RG-B001-CARD-001 | PICTURE_CARD | A Second Chance | COMMON | 1 | /assets/v27/rewards/cards/a-second-chance.webp |
| RG-B001-CARD-002 | PICTURE_CARD | The Life He Never Lived | UNCOMMON | 1 | /assets/v27/rewards/cards/the-life-he-never-lived.webp |
| RG-B001-CARD-003 | PICTURE_CARD | Enter GENESIS | COMMON | 1 | /assets/v27/rewards/cards/enter-genesis.webp |
| RG-B001-CARD-004 | PICTURE_CARD | The First Grind | UNCOMMON | 3 | /assets/v27/rewards/cards/the-first-grind.webp |
| RG-B001-CHAR-001 | CHARACTER_PICTURE | Flavio Reyes — Beginning | COMMON | 1 | /assets/v27/rewards/characters/flavio-beginning.webp |
| RG-B001-CHAR-002 | CHARACTER_PICTURE | Maya — Stay With Me | RARE | 1 | /assets/v27/rewards/characters/maya-stay-with-me.webp |
| RG-B001-CHAR-003 | CHARACTER_PICTURE | Nico — First Companion | UNCOMMON | 3 | /assets/v27/rewards/characters/nico-first-companion.webp |
| RG-B001-MON-001 | MONSTER_PICTURE | Gnawer — Field Study | COMMON | 3 | /assets/v27/rewards/monsters/gnawer-field-study.webp |
| RG-B001-DESK-001 | DESKTOP_WALLPAPER | Moonlit GENESIS | RARE | 0 | /assets/v27/rewards/wallpapers/desktop/moonlit-genesis.webp |
| RG-B001-DESK-002 | DESKTOP_WALLPAPER | City Beyond the Falls | EPIC | 1 | /assets/v27/rewards/wallpapers/desktop/city-beyond-the-falls.webp |
| RG-B001-MOB-001 | MOBILE_WALLPAPER | Reborn Under Moonlight | RARE | 0 | /assets/v27/rewards/wallpapers/mobile/reborn-under-moonlight.webp |
| RG-B001-MOB-002 | MOBILE_WALLPAPER | The Road Ahead | UNCOMMON | 1 | /assets/v27/rewards/wallpapers/mobile/the-road-ahead.webp |
| RG-B001-BG-001 | BACKGROUND | Genesis Blue — Astral Hall | COMMON | 0 | /assets/v27/rewards/backgrounds/genesis-blue-astral-hall.webp |
| RG-B001-BG-002 | BACKGROUND | Forged Gold — Night Citadel | UNCOMMON | 1 | /assets/v27/rewards/backgrounds/forged-gold-night-citadel.webp |
| RG-B001-SPEC-001 | SPECIAL_ART | Reborn Greedy — Founding Illustration | LEGENDARY | 5 | /assets/v27/rewards/special/reborn-greedy-founding.webp |

## Rarity mix

- COMMON: 5
- UNCOMMON: 5
- RARE: 3
- EPIC: 1
- LEGENDARY: 1

Batch 001 contains 15 rewards.

## Spoiler gating

The draw function already filters by reader progress using min_episode.

Batch 001 rules:
- min_episode 0: brand/world art with no story reveal
- min_episode 1: opening characters/scenes already safe after Episode 1
- min_episode 3: early gameplay/companion/monster material
- min_episode 5: first special illustration milestone

A reward does not become eligible merely because it exists in the catalog.

## Duplicate behavior

Duplicates remain legal and increase inventory quantity.
A duplicate does not erase or replace the original collection record.

## Asset production note

These rows are deliberately defined before artwork production so art can be generated against stable IDs and filenames.
Do not apply the seed migration until every referenced asset exists and rendered QA confirms the gallery surfaces.
