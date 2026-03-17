---
title: Level Progression and Unlocks
createdAt: '2026-02-25T00:28:33.561Z'
updatedAt: '2026-03-17T06:46:17.164Z'
description: >-
  Complete reference for all mechanics, features, and content unlocked as
  players level up
tags:
  - progression
  - leveling
  - unlocks
  - xp
  - experience
---
# Level Progression and Unlocks

Complete reference for all mechanics, features, and content unlocked as players level up. **Authoritative — last updated 2026-03-17.**

---

## Experience System

### XP Sources
- **Mission Completion**: Primary source of XP
- **Scanning Targets**: XP awarded for discovering new targets
- **Mining Operations**: Bonus XP for successful mining

### Level Thresholds
- Standard XP curve managed by `AppController.gd`
- XP persists across sessions
- Level-up triggers unlock checks

---

## Unlocks by Level

### Level 1 (Starting Level)
**Rockets:** Starter Rocket 1 (starterrocket1) — unibody

**Targets:** Asteroids (close range: 3–24 AU)

**Subcontractors:** 3 available

**Features:**
- Basic mining operations
- M1 and M2 progression
- Star map visible (shows Earth + discovered targets; expands as player discovers more)
- Contractor panel visible from M1 (choice is present even while tutorial is scripted)

---

### Level 2
**Rockets:** Starter Rocket 2 — 2× speed + 2× range — Cost: 1.3B F — unibody

**Targets:**
- Planets (TESS candidates)
- Far asteroids (24+ AU)

**Subcontractors:** 4 available

**Features:**
- Planet discovery toggle in Scanner Station
- Level 2 unlock overlay
- M3 progression

---

### Level 3
**Rockets:** Starter Rocket 3 — Cost: 4.0B F — unibody

**Targets:** All planet distance bands (120–340 AU) — requires Mission 3 completion

**Subcontractors:** 6 available

**Features:**
- Scanner Station purchasable (2.0B F) — requires Mission 3 completion
- M4 progression (transition to Free Operations)

---

### Level 4
**Subcontractors:** 8 available

**Features:**
- **Upgrade existing Earth structures** (cannot yet build new ones)
- Non-starter rockets may have slot selection when purchasing

---

### Level 5
**Subcontractors:** 10 available (all)

**Features:**
- **Room upgrades** unlock (mining laser tier, cargo bay expansion — accessed via room management screen, not launchpad)
- **Marketplace** becomes visible (live market prices, timing sell windows)
- **Build new structures** (first time player can place a new structure — Earth-based first)

---

### Level 6
**Features:**
- **Earth-based refineries** available
- Refinery upgrades increase capacity and performance at each tier

---

### Level 7
**Features:**
- **Off-world refineries** available (build at asteroids, planets, relay stations)
- Same upgrade path as Earth refineries

---

### Level 8
**Features:**
- **Scanner range increase** (measured in light-years; relay stations amplify further)
- Visual reveal: scan radius animates expanding on the star map
- **Two simultaneous missions** unlock

---

## Mission Cap

| Level | Active Missions |
|-------|----------------|
| 1–7 | 1 |
| 8+ | 2 |

- Cancelling a mission **auto-scraps the rocket** — no partial recovery.
- Free-launch rockets (no contractor attached) limited by port/launchpad capacity.
- Future: orbital permit tiers may cap total rockets/satellites in Earth orbit.

---

## Mission-Gated Content

| Milestone | What Unlocks |
|-----------|-------------|
| M1 complete | Star map accessible |
| M3 complete | Scanner Station purchasable (2.0B F) |
| M4 complete | Free Operations loop begins |

---

## Rocket System

### StarterRocket Family (Unibody)
All StarterRocket family rockets are prebuilt with a fixed internal layout — no room selection:
- Mining laser, drones, storage, engine/reactor are all integrated
- SR1, SR2, SR3 are the initial three; additional tiers visible as locked in hangar

### Non-Starter Rockets (Slot-Based)
From non-starter rocket classes, players choose their room loadout when purchasing:
- Available room types depend on rocket class and player level
- E.g. at certain class levels, a second mining laser slot becomes available
- Long-term: Minecraft-level per-component granularity (deferred — see roadmap)

---

## Subcontractor Tiers

| Level | Contractors Available |
|-------|----------------------|
| 1 | 3 |
| 2 | 4 |
| 3 | 6 |
| 4 | 8 |
| 5+ | 10 (all) |

---

## Implementation Notes

```gdscript
# RocketsManager.gd
const ROCKET_UNLOCK_LEVELS := {
    "starterrocket1": 1,
    "starterrocket2": 2,
    "starterrocket3": 3
}

# SatelliteStationPanel.gd
const PLANET_UNLOCK_LEVEL := 2

# SubcontractorManager.gd
const UNLOCK_TIERS := { 1: 3, 2: 4, 3: 6, 4: 8, 5: 10 }

# RocketsManager.gd
const ASTEROID_DISTANCE_BANDS_AU := [3.0, 24.0]
const PLANET_DISTANCE_BANDS_AU := [120.0, 220.0, 340.0]
```

---

## Related Docs
- @doc/game-design/gameplay-vision-20-questions
- @doc/game-design/rocket-and-room-system
- @doc/game-design/contractor-system
- @doc/game-design/economy-and-minerals
- @doc/game-design/construction-and-settlements
- @doc/game-design/long-term-features-roadmap

## Design Round 3 — 2026-03-17

### Non-Starter Rockets (Q9 — confirmed)
- Non-starter rockets (slot-based room selection) become available at **Level 5**, aligned with room upgrade unlock.
- All rockets before L5 are StarterRocket unibody family.

### XP Curve (Q18)
**Design target:** Tutorial arc (M1–M4) gets player to approximately Level 3.
After L3: progressive slowdown.

**Proposed curve (needs balance validation):**

| Transition | XP Required | Sessions (approx) |
|------------|-------------|-------------------|
| L1 → L2 | 200 XP | Same session (M1+M2) |
| L2 → L3 | 500 XP | Same/next session (M3+M4) |
| L3 → L4 | 1,200 XP | ~4–6 sessions |
| L4 → L5 | 3,000 XP | ~2 weeks casual |
| L5 → L6 | 7,500 XP | — |
| L6 → L7 | 18,000 XP | — |
| L7 → L8 | 45,000 XP | — |

**XP per mission (base):** Tutorial M1=80, M2=120, M3=160, M4=200. Free ops: 150–400 XP based on distance, minerals, discovery bonus.

> Needs implementation and balance validation — see XP curve task.
