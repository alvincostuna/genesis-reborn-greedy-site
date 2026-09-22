# GENESIS: REBORN GREEDY — Website

Private source repository for the GENESIS: REBORN GREEDY reader website and private Admin production dashboard.

## Current build phase

Supabase-native production cutover / private Admin manuscript viewer.

## Safety rules

- This repository is separate from the Academic Record System and TeacherHub projects.
- Do not store Supabase service-role keys, Postgres credentials, Cloudflare API tokens, or other secrets in Git.
- Unreleased Stage 1, Stage 2, and hidden Final Canon manuscripts must remain private.
- Public reader endpoints may expose only content that has passed the release gate.
- Drive remains archive/provenance; Supabase is the live production backend after Migration 014.

## Planned Admin modules

1. Production Dashboard
2. Manuscript Library
3. Part Viewer
4. Stage 1 / Stage 2 / Final Canon version tabs
5. Version Comparison
6. Preview as Reader
7. Release Queue
8. Release Controls

Development work uses feature branches and pull requests before merging to `main`.
