# GENESIS: REBORN GREEDY — Website

Private source repository for the **GENESIS: REBORN GREEDY — Official Light Novel** reader website and **GENESIS Admin — Control Center**.

## Current build phase

Brand-locked, Supabase-native website alignment and pre-launch preparation.

- Brand authority: **036**
- Public launch target: **Episodes 1–10 together**
- Ongoing cadence: **1 Part every 8 hours / 3 Parts per real day**
- Timezone: **Asia/Manila**
- Releases: **PAUSED**
- Roadmap V1: **ACTIVE / historical production authority**\n- Roadmap V2: **DRAFT / preserved prior synchronization draft**\n- Roadmap V3: **DRAFT / current full-system realignment target; NOT ACTIVE**
- Public/Admin database: **one existing GENESIS Supabase backend**

## Locked brand identity

- Wordmark: **GENESIS REBORN GREEDY**
- Permanent icon: **diamond sigil**
- Master tagline: **A SECOND LIFE. ONE FUTURE TO FORGE.**
- In-world game slogan: **LIVE MORE.**
- Reserved endgame mirror: **TWO LIVES. ONE FUTURE.**
- Hero identity: **MASTER_KEY_ART_SPLIT_WORLD_V1**

See `docs/BRAND_LOCK_036.md`.

## Start Package blueprints

1. `docs/PUBLIC_HOMEPAGE_BLUEPRINT.md`
2. `docs/ADMIN_CONTROL_CENTER_BLUEPRINT.md`
3. `docs/RELEASE_PREPARATION_FLOW.md`
4. `docs/PUBLIC_CODEX_VISIBILITY_RULES.md`

## Safety rules

- This repository is separate from the Academic Record System and TeacherHub projects.
- Never store Supabase secret/service keys, Postgres credentials, Cloudflare API tokens, or other secrets in Git.
- Unreleased Stage 1, Stage 2, Final Canon, draft roadmaps (V2/V3), and hidden game-database truth remain private.
- Public endpoints expose only release-gated reader-safe content.
- Supabase is operational truth; Drive remains mirror/provenance/archive where applicable.
- Do not activate Roadmap V3, activate any roadmap, or run the stale E006–E010 AI2 router from website work.
- Website development never grants runtime Class, Profession, Skill, or Temporal ownership.

## Admin target modules

- Overview
- Production
- Manuscripts
- Releases
- Roadmap
- Game Database
- Continuity
- Authority

Production alignment: Roadmap V3 is the current audited draft target for readiness/gating, while Roadmap V1 remains ACTIVE until an explicit cutover. Website work must never activate V3.\n\nCanonical flow: `Roadmap draft → 202 preflight → 203 Stage 1 → 103 Stage 2/finalization → 102 saga audit when due → FINAL_CANON → release queue → public release`.\n\nDevelopment uses feature branches and preview validation before live deployment.
