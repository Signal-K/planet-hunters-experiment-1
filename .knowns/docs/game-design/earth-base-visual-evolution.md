---
title: Earth Base Visual Evolution
createdAt: '2026-03-17T06:44:38.523Z'
updatedAt: '2026-03-17T06:45:36.164Z'
description: >-
  How the Earth base screen grows visually as the player builds — extremely
  important retention mechanic
tags:
  - spec
  - earth-base
  - visual
  - art
  - game-design
---
# Earth Base Visual Evolution

**Status:** Active — high priority
**Last updated:** 2026-03-17

> This is described as "extremely important" — the feeling of watching your base grow is a core retention and identity mechanic.

---

## Starting State (L1)
Three structures on screen:
- **Satellite Station** — scanner/telescope
- **Control Station** — mission command
- **Launchpad** — launch facility

Feel: functional but sparse. "Starter" aesthetic.

---

## Visual Evolution by Level

| Level | Visual Change |
|-------|---------------|
| L1 | 3 base structures, starter sprites |
| L4 | Existing structures upgrade visually (larger, more elaborate sprites) |
| L5 | New structures appear when built; placement animation; base feels like a campus |
| L6 | Refinery structure appears visually when built |
| L7+ | Off-world structures shown on star map, not Earth base |

---

## Design Principles
- Pixel-art aesthetic consistent with the rest of the game.
- Each structure has sprites at multiple upgrade tiers (not just stat changes).
- Visual progression legible without UI labels — player can *see* the growth.
- Structures have idle animations (rotating antenna, rocket prep, etc.).
- L1 version of each structure looks like the "young" version of what it becomes at L5.

---

## Implementation Notes
- Structure positions are fixed until spatial placement is decided (2026-03-23).
- Art required: sprite sheets for each structure across upgrade tiers.
- Building a new structure triggers a visual placement animation.
- Earth base screen should be designed to scale gracefully to 5–8 structures.

---

## Related Docs
- @doc/game-design/construction-and-settlements
- @doc/game-design/level-progression-and-unlocks
