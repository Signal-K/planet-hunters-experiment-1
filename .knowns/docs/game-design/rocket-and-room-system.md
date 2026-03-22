---
title: Rocket and Room System
createdAt: '2026-03-16T10:51:21.304Z'
updatedAt: '2026-03-17T06:46:41.350Z'
description: >-
  Specification for rockets, room upgrades, cargo bays, mining laser levels,
  wear mechanics, and the future custom ship-building system
tags:
  - spec
  - rockets
  - rooms
  - upgrades
  - game-design
---
# Rocket and Room System Specification

**Status:** Active  
**Last updated:** 2026-03-16

---

## Overview

Rockets are the primary vehicle for all missions. Each rocket has rooms/bays that affect mining capability and cargo capacity. Rooms are not player-controllable yet (revisit 2026-03-23), but the system is foundational to mid-game progression.

---

## Current Rocket Lineup

| Rocket ID | Unlock Level | Cost | Notes |
|-----------|-------------|------|-------|
| starterrocket1 | L1 | — | Starting rocket |
| starterrocket2 | L2 | 1.3B F | 2× speed + 2× range |
| starterrocket3 | L3 | 4.0B F | Further improved stats |

- Additional rocket tiers exist beyond L3 (locked with visible "locked" state in hangar).
- **5 starter rockets** are the initial set; new ones unlock via XP/missions.

---

## Room System (Current)

- All rockets currently have the same room loadout.
- Room upgrades unlock at **Level 5**.
- Room builder UI layout: **TBD — revisit 2026-03-23**.
- Room upgrades are a separate screen (not integrated into the launchpad scene).

### Key Room Types

| Room | Effect |
|------|--------|
| Mining Laser | Determines extraction depth and material tier access. Higher level → more of target allotment mined + harder materials |
| Cargo Bay | Determines maximum cargo per mission. Upgrade required to accept missions needing more than base capacity |
| (Future) Engine Room | Fuel efficiency / speed — not active yet |
| (Future) Medical Bay | Crew health support — not active yet |

### Room Upgrade Rules
- Rooms are installed/upgraded from a dedicated room management screen.
- If a rocket is retired or scrapped: installed rooms are **destroyed** (not returned to inventory). This is part of the salvage record.
- Room upgrades are permanent per rocket.

---

## Fuel

- Fuel is tracked per-rocket and limits total mission duration (mining + orbit time).
- Rockets are **not refuelable or reusable in the current build**.
- Each rocket is single-use: once a mission is done, it's done.
- Long-term: fuel refineries, in-situ refuelling at relay stations, reusable rockets.

---

## Wear Progression

- Wear is permanent per-rocket (not per-model).
- Two identical rocket models can develop distinct wear appearances over time.
- Wear is visible to other players in future multiplayer contexts.
- Only applies while a rocket is active (non-reusable rockets wear only until mission completion).

---

## Locked Content Signposting

- Locked rocket slots are visible in the hangar with a "locked" state.
- A future section will show **individual parts** (boosters, engines, shuttles) with an indication the player can use these to build their own ship.
- Custom ship-building: **long-term — revisit 2026-03-30**.

---

## Room Unlock Progression (Level-Gated)

| Level | Unlock |
|-------|--------|
| 1–4 | Rooms exist but are not upgradeable |
| 5 | Room upgrades become available |
| 8 | Scanner range increase (relay station amplification unlocks) |

---

## Mining Laser Details

- Mining laser level determines:
  1. How much of the target's total resource allotment can be mined.
  2. Which material tiers are accessible (harder materials require higher laser level).
- Stronger laser ≠ faster mining. Speed is fixed; depth and access are the variable.
- Mining laser is a room-level upgrade, not a separate purchase.

---

## Cargo Bay Details

- Base cargo capacity is set by the rocket model.
- Cargo Bay room upgrades extend this capacity.
- If a mission's required quantity exceeds cargo capacity: player is shown why they cannot accept the mission ("Cargo capacity insufficient — upgrade your Cargo Bay").

---

## Related Docs
- @doc/game-design/level-progression-and-unlocks
- @doc/game-design/economy-and-minerals
- @doc/game-design/target-system
- task-v7u2n9: Implement persistent mineral inventory and construction manager

## Design Review Round 2 — 2026-03-17

### Room System: Slot-Based (Not Spatial)
- Rooms are placed into **slots**, not freely positioned on a 2D grid.
- No adjacency bonuses in the current design (keeps it mobile-friendly).
- Room customisation and components are planned long-term (see roadmap).

### StarterRocket Family — Unibody
- All StarterRocket family rockets (SR1, SR2, SR3, etc.) are **prebuilt/unibody**.
- Unibody rockets include: mining laser, drones, storage, engine/reactor — all in one.
- Players cannot modify the room layout of StarterRocket family rockets.

### Non-Starter Rockets — Slot Choice Required
- When upgrading to a non-starter rocket, the player must **choose which rooms to install** in available slots.
- E.g. at L4 of a new ship class, a second mining laser slot may become available.
- This is the first moment of meaningful ship composition choice.

### Mission Cap
- One active mission at a time until **L8**, where two simultaneous missions unlock.
- Cancelling a mission = rocket is auto-scrapped.

### Long-Term Vision (Minecraft-level customisation)
- Long-term goal: granular per-component customisation (rooms, components, panels, etc.).
- Everything can be built, rebuilt, and customised.
- Roadmap: identify milestones between current slot system and full custom ship-building.
- See @doc/game-design/long-term-features-roadmap

## Design Round 3 — 2026-03-17

### Per-Mission Rocket Purchase (Q1, Q11)
- Players **purchase a rocket for every mission** — no stockpiling.
- `RocketsManager.get_trip_purchase_cost()` calculates the per-trip cost.
- Purchase is integrated into the launchpad/mission-start flow (confirmed in codebase).
- A 20% build discount (`build_discount_pct: 0.20`) already exists for rocket purchases.

### Non-Starter Rocket Reveal (Q9)
- First non-starter rocket (with room slot UI) accessible at **Level 5**.
- StarterRocket family (SR1–SR3) remain purchasable at any level as the unibody option.
- The slot selection UI is the first composition decision the player makes.
