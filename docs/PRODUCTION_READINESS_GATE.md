# GENESIS Website/Admin Production Readiness

Version: PRG-V2  
Owner: Website/Admin Builder

## Scope

This gate covers the official public website and protected Admin Control Center only.

Story production, committed Parts, production routing, database canon data, and story laws are outside the Website/Admin Builder mutation boundary.

## Mandatory readiness states

- **BLOCKED** — any S0 or S1 source/runtime gate fails.
- **CANDIDATE_READY** — source, security, functional and visual QA pass; deployment verification still required.
- **PRODUCTION_READY** — isolated public candidate and protected Admin deployment pass, rollback points are known.
- **FINISHED_TARGET** — production-ready plus all approved visible controls are functional or honestly unavailable.

## Required source capabilities

1. Public/Admin isolation.
2. Protected Admin authentication/RBAC path.
3. Functional global Search.
4. Functional notification center with read/unread state.
5. Backend-authoritative release scheduling with client fallback only.
6. Exact Episode/Part/progress reader resume.
7. Part-level Latest Releases.
8. Stable visual account/avatar treatment.
9. Reader-safe varied World/Codex presentation.
10. Honest Fan Page and Support state.
11. Mobile/desktop shell and reduced-motion-safe ambient overlays.
12. Current-main/full-candidate CI and visual QA.

## Deployment rule

Public live deployment remains independently gated by `genesis-live`.

Protected Admin deployment remains independently gated by `genesis-admin-preview`.

A website release must never resume AI-2, rewrite Final Canon, replace the active production run, or expose unreleased/candidate story data.

## Current implementation branch

`website-finish-v1`

This branch reconciles Admin and public website work onto the current main lineage. The legacy `feat/admin-manuscript-viewer` branch is no longer the target deployment lineage once this branch is merged and protected Admin deployment succeeds.
