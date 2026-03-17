---
title: 'Construction, Outposts & Refineries'
description: >-
  Structures players can build on Earth and off-world — unlock gates, building
  types, placement mechanics
tags:
  - spec
  - construction
  - buildings
  - refineries
  - game-design
updatedAt: '2026-03-17T06:46:41.349Z'
---
# Construction, Outposts & Refineries

**Status:** Partially deferred — revisit 2026-03-23 for placement mechanic decision (grid vs. free-form).
**Last updated:** 2026-03-17

---

## Overview
Players can build static structures on Earth and on discovered anomalies (asteroids, planets) to create a persistent presence, automate resource collection, and extend their operational range.

## Building Types

| Structure | Effect |
|-----------|--------|
| **Mining Outpost** | Passive resource collection at a target over time |
| **Refinery** | Converts raw minerals into higher-value refined materials or fuel |
| **Relay Station** | Extends scanner range; enables refuelling in deep space |
| **Settlement** | Increases Scientific Reputation; living quarters for characters (future) |

## Unlock Timeline

| Level | Unlock |
|-------|--------|
| L4 | Upgrade existing Earth structures |
| L5 | Build new structures (Earth-based first) |
| L6 | Earth-based refineries |
| L7 | Off-world refineries (asteroids, planets, relay stations) |

## Cost & Materials
- Players can pay Francs to convert minerals into a structure directly (no crafting required — simple early-game path).
- The cheapest route is to mine → refine → craft yourself (each step reduces cost).
- Own-mined minerals applied toward construction receive a 15% discount.

## Placement Mechanics
- **Deferred decision (revisit 2026-03-23):** Grid-based vs. free-form placement not yet decided.
- Structures are upgradeable: each level increases efficiency or capacity.

## Shared World
- Structures are visible to other players visiting the same target.
- Future: player outposts may become Neutral Trade Hubs accessible to any player.

## Related Docs
- @doc/game-design/economy-and-minerals
- @doc/game-design/long-term-features-roadmap
- @doc/game-design/rocket-and-room-system

## Design Round 3 — 2026-03-17

### Universal First-Time Mechanic Tutorial (Q6)
- When a contractor mission introduces a **new mechanic** (refining, construction, structure placement, etc.), a tutorial is triggered the **first time that mission type is attempted**.
- This is a universal pattern — applies to all new mechanics post-M4, not just construction.
- Tutorial is inline/overlay, not a separate scripted mission.
- Tutorial shown exactly once per mechanic type.

### Off-World Refinery Slot Usage (Q7 — confirmed)
- Accessing an off-world refinery requires an active mission slot (confirmed intentional).
- Design implication: build off-world refineries at L7 but plan for L8 before they become operationally efficient.
