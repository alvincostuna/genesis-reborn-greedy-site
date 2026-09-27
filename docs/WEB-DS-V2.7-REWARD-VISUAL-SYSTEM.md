# WEB-DS-V2.7 — Reward Visual System

Status: IMPLEMENTATION
Branch: web-ds-v2-7-rewards

## Core progression rule

Every 1,000 Reader EXP:
- advance exactly one Tier
- grant one random spoiler-safe collectible draw

This replaces the previous 2,000 EXP Tier threshold.

Existing EXP earning values remain unchanged:
- Read eligible Part: +100 EXP
- Verified Share: +200 EXP and +1 Part advance
- Support ₱9: +100 EXP and +2 Parts
- Support ₱49: +500 EXP and +14 Parts
- Support ₱189: +2,000 EXP and +60 Parts, therefore two Tier-ups at the new threshold

## Reward visual categories

The collectible catalog supports:
- PICTURE_CARD
- CHARACTER_PICTURE
- MONSTER_PICTURE
- DESKTOP_WALLPAPER
- MOBILE_WALLPAPER
- BACKGROUND
- SPECIAL_ART

## Reader-facing reward surfaces

### Quest page
Shows the visual reward ecosystem and explains that each Tier-up grants one random draw.

### Adventurer Profile
Portfolio remains permanent. Duplicates remain allowed.

### Future reward gallery
Recommended filters:
- All
- Cards
- Characters
- Monsters
- Wallpapers
- Backgrounds
- Special Art

## Spoiler rules

A reward may only enter a reader's eligible random pool when its minimum reveal Episode has already been reached by that reader.

Reward art must not reveal:
- future forms
- unrevealed bosses
- hidden identities
- unrevealed locations
- later equipment
- later factions
- unresolved mystery answers

## Asset production folders

public/assets/v27/rewards/cards/
public/assets/v27/rewards/characters/
public/assets/v27/rewards/monsters/
public/assets/v27/rewards/wallpapers/desktop/
public/assets/v27/rewards/wallpapers/mobile/
public/assets/v27/rewards/backgrounds/
public/assets/v27/rewards/special/

## Recommended production dimensions

Picture cards:
- 900 × 1200 portrait

Character pictures:
- 1200 × 1600 portrait

Monster pictures:
- 1200 × 1200 square or 1600 × 1200 landscape

Desktop wallpapers:
- 2560 × 1440
- optional 3440 × 1440 ultrawide later

Mobile wallpapers:
- 1080 × 1920

Backgrounds:
- 1920 × 1080 or 2560 × 1440

Special art:
- composition-specific, minimum long side 1600 px

## Rarity presentation

COMMON
UNCOMMON
RARE
EPIC
LEGENDARY

Rarity changes presentation and collection value only unless separately defined later. It must not expose future canon.

## Backend state

Website Migration 003 is still unapplied in production at the time of this V2.7 branch work.
Its proposed schema has been updated before application so the 1,000 EXP rule and reward asset types can be contract-tested first.

Do not apply Migration 003 until its prerequisite website migration sequence and contract tests are deliberately executed.
