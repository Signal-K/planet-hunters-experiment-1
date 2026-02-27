---
title: 'spec,progression,levels,unlocks,reference'
createdAt: '2026-02-25T00:28:33.561Z'
updatedAt: '2026-02-25T08:30:06.421Z'
description: >-
  Complete reference for all mechanics, features, and content unlocked as
  players level up
spec: true
tags:
  - progression
  - leveling
  - unlocks
  - xp
  - experience
---
# Level Progression and Unlocks

Complete reference for all game mechanics, features, and content unlocked as players progress through experience levels.

## Experience System

### XP Sources
- **Mission Completion**: Primary source of XP
- **Scanning Targets**: XP awarded for discovering new targets
- **Mining Operations**: Bonus XP for successful mining

### Level Thresholds
Managed by `AppController.gd`:
- Level progression follows standard XP curve
- XP persists across sessions
- Level-up triggers unlock checks

## Unlocks by Level

### Level 1 (Starting Level)
**Rockets:**
- Starter Rocket 1 (starterrocket1)

**Targets:**
- Asteroids (close range: 3-24 AU)

**Subcontractors:**
- First 3 subcontractors available

**Features:**
- Basic mining operations
- Scanner Station (must be purchased for 2.0B F at Mission 3)
- Mission 1 & 2 progression

### Level 2
**Rockets:**
- Starter Rocket 2 (starterrocket2)
  - 2x speed increase
  - 2x range increase
  - Costs 1.3B francs

**Targets:**
- Planets unlocked (telescope-tess anomalies)
- Far asteroids (24+ AU)

**Subcontractors:**
- 4 subcontractors available (1 new unlock)

**Features:**
- Planet discovery toggle in Scanner Station
- Level 2 unlock overlay with feature summary
- Mission 3 progression

### Level 3
**Rockets:**
- Starter Rocket 3 (starterrocket3)
  - Further improved stats
  - Costs 4.0B francs

**Targets:**
- All planet distance bands (120-340 AU)
- Requires Mission 3 completion

**Subcontractors:**
- 6 subcontractors available (2 new unlocks)

**Features:**
- Scanner Station becomes available for purchase
- Mission 4 progression
- Advanced mining operations

### Level 4
**Subcontractors:**
- 8 subcontractors available (2 new unlocks)

### Level 5+
**Subcontractors:**
- All 10 subcontractors available (2 new unlocks at L5)

## Mission-Gated Content

Some features unlock based on mission progression rather than level:

### Mission 3 Completion
- Scanner Station becomes purchasable (2.0B F)
- Starter Rocket 3 becomes available (if Level 3+)

### Mission Stage Progression
Tracked separately from XP level:
- Mission 1: Tutorial completion
- Mission 2: Introduces second rocket
- Mission 3: Scanner Station unlock
- Mission 4: Advanced features
- Mission 5: Contractors introduction

## Implementation Details

### Code References

**Rocket Unlocks:**
```gdscript
# RocketsManager.gd
const ROCKET_UNLOCK_LEVELS := {
    "starterrocket1": 1,
    "starterrocket2": 2,
    "starterrocket3": 3
}
```

**Planet Unlock:**
```gdscript
# SatelliteStationPanel.gd
const PLANET_UNLOCK_LEVEL := 2
```

**Subcontractor Tiers:**
```gdscript
# SubcontractorManager.gd
const UNLOCK_TIERS := {
    1: 3,  # 3 contractors at L1
    2: 4,  # 4 contractors at L2
    3: 6,  # 6 contractors at L3
    4: 8,  # 8 contractors at L4
    5: 10  # All 10 at L5
}
```

**Target Distance Gating:**
```gdscript
# RocketsManager.gd
const ASTEROID_DISTANCE_BANDS_AU := [3.0, 24.0]
const ASTEROID_REQUIRED_LEVEL_BY_BAND := [1, 2]
const PLANET_DISTANCE_BANDS_AU := [120.0, 220.0, 340.0]
const PLANET_REQUIRED_LEVEL_BY_BAND := [3, 3, 3]
```

### Unlock Flow

1. **Player gains XP** → `AppController.add_experience()`
2. **Level threshold crossed** → `experience_updated` signal emitted
3. **Unlock check triggered** → `_unlock_rockets_for_level()`
4. **RocketsManager.unlock_for_level()** → Checks all rocket unlock levels
5. **UI updates** → Rocket selector, scanner panel, subcontractor panel refresh

### UI Indicators

**Locked Content Display:**
- Rockets: Grayed out with "Unlock at Level X" text
- Planets: Toggle disabled with "Planets unlock at Level 2"
- Subcontractors: "Locked until level X" status
- Scanner Station: Hidden until Mission 3

**Unlock Notifications:**
- Level 2: Special overlay showing planet discovery + new unlocks
- New rockets: Notification on level-up
- Subcontractors: Available count updates in panel

## Testing

**Test Suite:** `run_experience_tests.gd`
- XP gain validation
- Level-up threshold checks
- Rocket unlock verification (SR2 at L2, SR3 at L3)
- Scanner unlock gating (Mission 3)
- Subcontractor tier progression

## Design Notes

### Progression Pacing
- Early game (L1-2): Focus on learning mechanics
- Mid game (L3-4): Expanded options and strategic depth
- Late game (L5+): Full roster for optimization

### Economic Balance
- Rocket costs scale with capability
- Mining yields tuned for ~115% return (full mine + scrap)
- Scanner Station (2.0B F) is major mid-game investment

### Future Expansion
- Additional rocket tiers beyond L3
- More subcontractor specializations
- Advanced mission types at higher levels
- Prestige/endgame progression systems
