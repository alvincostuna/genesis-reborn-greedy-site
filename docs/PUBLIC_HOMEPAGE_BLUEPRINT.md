# Public Homepage Blueprint

**Target:** GENESIS: REBORN GREEDY — Official Light Novel  
**Status:** PREPARED / NOT DEPLOYED  
**Brand authority:** 036

## 1. Hero

Use approved `MASTER_KEY_ART_SPLIT_WORLD_V1` as the dominant visual.

Required content:
- diamond sigil
- GENESIS REBORN GREEDY wordmark
- **A SECOND LIFE. ONE FUTURE TO FORGE.**
- primary CTA: **Read Episodes 1–10**
- secondary CTA: **Explore the Codex**

The in-world billboard in the art uses **GENESIS / LIVE MORE.** and must not be confused with the novel tagline.

## 2. Launch + release clock

Immediately below the hero:

**Launch state**
- Episodes 1–10 available together once launch is approved.

**Ongoing state**
- New Part every 8 hours.
- 3 Parts per real day.
- Asia/Manila release clock.

Display:
- latest released Part;
- next scheduled Part;
- countdown;
- release cadence;
- PAUSED state when releases are paused.

All timing comes from Supabase. No hardcoded client-only schedule.

## 3. Continue / latest reading

Show:
- latest released Episode;
- latest released Part;
- Continue Reading when reader progress exists;
- Start from Episode 1 for new readers;
- Episode cards grouped cleanly, not a database table.

## 4. Codex preview

Reader-facing categories:
- Monsters
- Classes
- Professions
- Skills
- Items
- Loot
- Maps
- NPCs
- Quests
- Crafting
- Pets / Mounts
- Achievements

Only spoiler-safe released knowledge appears.

## 5. World / premise

Short, high-value copy that explains:
- a second life;
- Earth vs Genesis;
- the living game world;
- forging, progression, friendship, economy, exploration;
- no unreleased endgame spoilers.

## 6. About / series identity

Show:
- Official Light Novel descriptor;
- release cadence;
- master tagline;
- optional short author/project note later.

## Navigation

Desktop:
`Home | Read | Episodes | Codex | World | About`

Mobile:
compact diamond + GENESIS header with drawer.

## Visual direction

- warm gold and parchment accents for rebirth/fantasy;
- deep black and electric blue for Genesis/cyberpunk;
- red reserved as a focused GREEDY/accent color;
- elegant display serif for headings;
- highly readable body UI type;
- subtle glow, restrained motion;
- no generic gaming-template look.

## Homepage data contracts

Public homepage consumes only public-safe APIs:
- brand identity;
- release clock;
- episode library;
- released story Parts;
- public Codex entity cards.

It must never read `genesis_private` tables directly from the browser.
