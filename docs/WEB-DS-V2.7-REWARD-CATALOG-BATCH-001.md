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
| RG-B001-CARD-001 | PICTURE_CARD | Genesis Awakening | COMMON | 1 | /assets/v27/rewards/genesis-awakening.webp |
| RG-B001-CARD-002 | PICTURE_CARD | Flavio & Nico — Early Party | UNCOMMON | 1 | /assets/v27/rewards/flavio-nico-early-party.webp |
| RG-B001-CARD-003 | PICTURE_CARD | Starter Town — Safe Zone | COMMON | 1 | /assets/v27/rewards/starter-town-safe-zone.webp |
| RG-B001-CARD-004 | PICTURE_CARD | Beginner Hunt | UNCOMMON | 3 | /assets/v27/rewards/beginner-hunt.webp |
| RG-B001-CHAR-001 | CHARACTER_PICTURE | Flavio Reyes | COMMON | 1 | /assets/v27/rewards/flavio-reyes.webp |
| RG-B001-CHAR-002 | CHARACTER_PICTURE | Amihan “Maya” Villareal | RARE | 1 | /assets/v27/rewards/maya-villareal.webp |
| RG-B001-CHAR-003 | CHARACTER_PICTURE | Nico Salazar | UNCOMMON | 3 | /assets/v27/rewards/nico-salazar.webp |
| RG-B001-MON-001 | MONSTER_PICTURE | Young Gnawer | COMMON | 3 | /assets/v27/rewards/young-gnawer.webp |
| RG-B001-DESK-001 | DESKTOP_WALLPAPER | Early GENESIS World Panorama | RARE | 0 | /assets/v27/rewards/early-genesis-world-panorama.webp |
| RG-B001-DESK-002 | DESKTOP_WALLPAPER | Flavio & Early Cast | EPIC | 1 | /assets/v27/rewards/flavio-early-cast-wallpaper.webp |
| RG-B001-MOB-001 | MOBILE_WALLPAPER | Reborn Under Moonlight | RARE | 0 | /assets/v27/rewards/reborn-under-moonlight.webp |
| RG-B001-MOB-002 | MOBILE_WALLPAPER | The Road Ahead | UNCOMMON | 1 | /assets/v27/rewards/the-road-ahead.webp |
| RG-B001-BG-001 | BACKGROUND | Genesis Blue — Astral Hall | COMMON | 0 | /assets/v27/rewards/genesis-blue-astral-hall.webp |
| RG-B001-BG-002 | BACKGROUND | Forged Gold — Night Citadel | UNCOMMON | 1 | /assets/v27/rewards/forged-gold-night-citadel.webp |
| RG-B001-SPEC-001 | SPECIAL_ART | Reborn Greedy — Founding Illustration | LEGENDARY | 5 | /assets/v27/rewards/reborn-greedy-founding.webp |

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
