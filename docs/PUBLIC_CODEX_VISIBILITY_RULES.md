# Public Codex Visibility Rules

**Purpose:** expose GENESIS world data without leaking future canon.

## Core law

**Backend truth is not public knowledge.**

A database row existing in Supabase never means the reader can see it.

## 1. Entity visibility

An entity can appear publicly only when:
- it has an approved public identity;
- its reveal threshold is satisfied by a released story Part; or
- the Commander explicitly approves an earlier public reveal.

If `first_public_part_id` has not been released, the entity is hidden.

## 2. Field-level visibility

Entities may reveal progressively.

Example: a monster may first reveal:
- name
- type
- known map

Later Parts may reveal:
- exact HP/SP
- weakness
- loot
- taming data
- boss relationship

Use `entity_reveals` for field-level reveal history.

## 3. Visibility states

Recommended display states:

- **HIDDEN** — no public existence
- **TEASED** — safe name/very limited teaser only
- **REVEALED** — standard public card
- **EXPANDED** — later fields unlocked
- **ADMIN_ONLY** — never public through normal story progression

The public API returns only safe fields; it must not send hidden fields and rely on CSS/JavaScript to hide them.

## 4. Categories

Initial public Codex:
- Monsters
- Classes
- Professions
- Skills
- Items
- Loot
- Maps

Second wave:
- NPCs
- Quests
- Crafting
- Pets / Mounts
- Achievements

## 5. High-risk spoiler domains

Default to ADMIN_ONLY or late gated:
- Temporal Legacy unrevealed stages
- predecessor identities/memories before reveal
- Finality
- Genesis Reforge
- Finality Archive
- Rogelio/Krik endgame choice sequence
- unrevealed Worldsmith proofs
- Krik mystery mechanics
- unrevealed boss/MVP identities
- future unique/mythic items

## 6. Roadmap safety

Roadmap V2 is DRAFT and must never be used as direct public-reveal proof.

Public reveal proof comes from **released Final Canon**, not planned future Parts.

## 7. Public search

Search must operate only on public-safe entity cards.
Hidden names must not leak through:
- autocomplete;
- result counts;
- slugs;
- API errors;
- related-entity links.

## 8. Related entities

A public card may link only to other currently visible entities.
If a relation points to a hidden entity, omit the relation rather than displaying “???” unless the story intentionally established a mystery placeholder.

## 9. Revision rule

If canon changes before release, public Codex follows the final released truth.
Historical Draft/V2 planning data never becomes public merely because it once had a reveal binding.

## 10. Admin difference

Admin can inspect full canonical mechanics and reveal metadata.
Public receives only filtered, release-safe projections.

## 11. Launch behavior

At the Episodes 1–10 launch:
- reveal all entities/fields whose reveal Parts are within released E001–E010;
- keep every later reveal hidden;
- subsequent 8-hour Part releases unlock eligible Codex data automatically after the Part is public.
