---
title: Characters System (Deferred)
description: Character roles, crew recruitment, room assignment, and visualization — deferred to 2026-03-30
createdAt: '2026-05-13T02:03:01.898Z'
updatedAt: '2026-05-13T08:07:46.824Z'
tags:
  - project-landnam
  - doc-kind-mechanic
  - spec
  - characters
  - crew
  - game-design
  - deferred
  - mechanics
  - design
---

[← Back to Index](../INDEX.md)

# Characters System (Deferred)

**Status:** Deferred — revisit 2026-03-30
**Last updated:** 2026-03-17

---

## Overview
Characters (crew) can be recruited using Francs or found during exploration. They are assigned to rocket rooms to provide stat buffs.

## Roles & Buffs

| Role | Effect |
|------|--------|
| **Engineer** | Reduces fuel consumption |
| **Miner** | Increases material yield or reduces laser heat buildup |
| **Scientist** | Increases XP from TESS classifications and discovery probability |
| **Pilot** | Reduces transit time |

> ⚠️ **Note (2026-03-17):** The room system uses a slot-based model (not spatial adjacency). Exact mechanics of how characters interact with room slots is subject to change when the room system is fully specced (2026-03-23).

## Visualization
- Characters appear as simple animated sprites within their assigned rooms.
- Interaction allows viewing their level and skills.

## Progression
- Characters gain Role XP by being active during missions.
- Higher levels unlock Special Abilities (e.g. "Overdrive Drill").

## Integration
- Characters are part of the Star Sailors ecosystem (same account, same character pool).
- See @doc/game-design/mechanics/rocket-and-room-system for room slot decisions.
- See @doc/game-design/long-term-features-roadmap for revisit date.
