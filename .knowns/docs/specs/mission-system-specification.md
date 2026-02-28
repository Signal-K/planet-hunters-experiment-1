---
title: 'spec,missions,game-design,reference'
createdAt: '2026-02-25T08:19:42.936Z'
updatedAt: '2026-02-27T08:26:41.018Z'
description: >-
  Complete specification for all 5 missions including objectives, mechanics,
  progression, rewards, and onboarding flow
spec: true
tags:
  - missions
  - spec
  - design
  - game-design
---
# Mission System Specification

## Overview

Planet Hunters features a 5-mission progression system that introduces core mechanics incrementally. Each mission teaches new concepts, unlocks capabilities, and gates progression to ensure players master fundamentals before advancing.

## Mission Architecture

### Progression Model
- **Linear Gating**: Missions unlock sequentially (M1 → M2 → M3 → M4 → M5)
- **Completion Trigger**: Mission debrief action (sell/scrap/salvage) advances stage
- **State Persistence**: Mission progress stored in `mission_logs.json`
- **Level System**: Player XP/level unlocks rockets and capabilities

### Core Loop
1. **Briefing**: Understand mission objective and requirements
2. **Preparation**: Build/select rocket, choose target
3. **Launch**: Travel to target
4. **Mining**: Extract resources from target
5. **Return**: Bring cargo back to Earth
6. **Debrief**: Choose payout option, advance progression

---

## Mission 1: First Launch

### Objective
Teach basic game loop: build → launch → mine → return → debrief

### Mechanics Introduced
- Rocket construction (Starter Rocket 1)
- Predefined target selection
- Mining minigame basics
- Return to Earth flow
- Mission debrief options

### Requirements
- **Rocket**: Starter Rocket 1 (L1, auto-unlocked)
- **Target**: Training Asteroid A (predefined, 3 AU)
- **Cost**: ~1B F (SR1 build cost)
- **Scanner**: Not required (hidden until M3)

### Rewards
- **Ratio**: 1.2x rocket cost
- **Expected**: ~1.2B F (full mine + scrap)
- **Unlocks**: Mission 2, Starter Rocket 2

### Tutorial Flow
1. "Build your first rocket" → Open Launchpad, create SR1
2. "Launch mission" → Press Launch (target pre-selected)
3. "Mine resources" → Press Mine at target preview
4. "Return to Earth" → Press Return Home with cargo
5. "Complete debrief" → Choose payout option

### Implementation References
- Task: task-hcaynf (Gate scanner to M3)
- Task: task-x48i3q (Mission selector progression)
- Code: `RocketsManager.PREDEFINED_MISSION_TARGETS[1]`

---

## Mission 2: Upgrade Path

### Objective
Introduce rocket progression and demonstrate yield improvements

### Mechanics Introduced
- Rocket level progression (L1 → L2)
- Same-target revisit with better equipment
- Higher mining yield (L2 laser = 20% vs L1 = 10%)
- Economic scaling

### Requirements
- **Rocket**: Starter Rocket 2 (L2, unlocked after M1)
- **Target**: Training Asteroid B (predefined, 12 AU)
- **Cost**: ~1.3B F (SR2 build cost)
- **Scanner**: Not required (still hidden)

### Rewards
- **Ratio**: 1.3x rocket cost
- **Expected**: ~1.69B F (full mine + scrap)
- **Unlocks**: Mission 3, Scanner Station

### Tutorial Flow
1. "Unlock L2 rocket" → Debrief M1 triggers SR2 unlock
2. "Build upgraded rocket" → Create SR2 in Launchpad
3. "Launch to new target" → Target pre-selected (12 AU)
4. "Mine with better laser" → 20% yield vs 10% in M1
5. "Complete debrief" → Advance to M3

### Implementation References
- Task: task-lumudz (L2 mission requirement)
- Task: task-q5z1xo (1.3x reward ratio)
- Code: `RocketsManager.PREDEFINED_MISSION_TARGETS[2]`

---

## Mission 3: Scanner Unlock

### Objective
Introduce scanning system and player-driven target selection

### Mechanics Introduced
- Scanner Station construction (2B F cost)
- Target scanning and discovery
- Asteroid filtering (untargeted only)
- Distance/level gating visualization
- Player choice in target selection

### Requirements
- **Rocket**: Starter Rocket 2 (L2, from M2)
- **Target**: Player-selected asteroid (5 options, 1 reachable)
- **Cost**: 2B F (scanner build) + rocket cost
- **Scanner**: Required (first use)

### Rewards
- **Ratio**: 1.3x rocket cost (same as M2)
- **Expected**: Variable based on target
- **Unlocks**: Mission 4, Starter Rocket 3, Planet scanning

### Tutorial Flow
1. "Build Scanner Station" → Unlock dialogue, pay 2B F
2. "Run your first scan" → Open Scanner, press Scan
3. "Choose scanned target" → Select from 5 asteroids (1 reachable)
4. "Launch to selected target" → Standard mining loop
5. "Complete mission" → Debrief advances to M4

### Scanner Behavior
- Shows 5 untargeted asteroids
- Displays distance (AU) and required level
- Only 1 target within SR2 range (12 AU)
- Others blocked by level/distance constraints
- Filters out previously targeted asteroids

### Implementation References
- Task: task-hcaynf (Scanner gating to M3)
- Task: task-tkj44s (Scanner introduction)
- Task: task-srnf59 (Create mission 3)
- Code: `RocketsManager.get_mission3_targets()`
- Const: `SCANNER_BUILD_COST = 2000000000`

---

## Mission 4: Planetary Exploration

### Objective
Introduce exoplanet targets and long-range exploration

### Mechanics Introduced
- Starter Rocket 3 (L3, 10x range of L2)
- Planet target type (toggle in scanner)
- Higher mining yield (L3 laser = 30%)
- Rare minerals (gold, platinum in higher amounts)
- Multiple buyers (3 total, 2 locked by affinity)
- Subcontractor system preview

### Requirements
- **Rocket**: Starter Rocket 3 (L3, unlocked after M3)
- **Target**: Exoplanet Kepler-442b Proxy (predefined, 120 AU)
- **Cost**: 4B F (SR3 build cost)
- **Scanner**: Toggle to "Planets" mode

### Rewards
- **Ratio**: 1.4x rocket cost
- **Expected**: ~5.6B F (full mine + scrap)
- **Unlocks**: Mission 5, Contractor system

### Tutorial Flow
1. "Unlock L3 rocket" → Debrief M3 triggers SR3 unlock
2. "Build planetary rocket" → Create SR3 (4B F)
3. "Toggle to planets" → Scanner shows planet targets
4. "Launch to exoplanet" → 120 AU range requires L3
5. "Mine rare minerals" → 30% yield, gold/platinum
6. "See multiple buyers" → Debrief shows 3 buyers (2 locked)

### Scanner Behavior
- Toggle between "Asteroids" and "Planets"
- Shows 5 untargeted planets
- Displays distance and L3+ requirement
- Filters out previously targeted planets

### Implementation References
- Task: task-vergrc (Create mission 4)
- Task: task-h819cf (Add second rocket)
- Code: `RocketsManager.PREDEFINED_MISSION_TARGETS[4]`
- Code: `RocketsManager.get_mission4_targets()`

---

## Mission 5: Contractor Missions

### Objective
Introduce contractor system and strategic choice

### Mechanics Introduced
- Contractor offers (Rocketlab vs Astroforge)
- Requested mineral allotments
- Contractor effects (build discount vs payout bonus)
- Affinity system
- Payout cap (1.4B F max)
- Strategic trade-offs

### Requirements
- **Rocket**: Any L1+ rocket (recommended: SR1 or SR2)
- **Target**: Contract Asteroid C (recommended, 8 AU)
- **Cost**: Variable (discount if Rocketlab chosen)
- **Scanner**: Select asteroid matching mineral request

### Rewards
- **Ratio**: 1.1x base (before contractor bonus)
- **Cap**: 1.4B F maximum payout
- **Contractor Effects**:
  - **Rocketlab**: 20% build discount
  - **Astroforge**: 1.15x payout multiplier (capped)
- **Affinity**: +1 with chosen contractor (no penalty to other)

### Tutorial Flow
1. "Review contractors" → See Rocketlab and Astroforge offers
2. "Accept contract" → Choose contractor, see mineral request
3. "Select target" → Scanner recommends asteroid with minerals
4. "Launch mission" → Standard mining loop
5. "Complete contract" → Debrief applies contractor effects

### Contractor System
- **Rocketlab**: Build discount effect
  - 20% off rocket purchase
  - Good for expensive rockets
- **Astroforge**: Payout bonus effect
  - 1.15x payout multiplier
  - Capped at 1.4B F total
  - Good for high-value cargo

### Economic Balance
- Payout cap prevents over-earning
- L1 rocket sufficient (no need for expensive L3)
- Contractor choice creates strategic decision
- No penalty for ignored contractor

### Implementation References
- Task: task-jom58m (Create mission 5)
- Code: `RocketsManager.MISSION5_CONTRACTOR_OFFERS`
- Code: `RocketsManager.get_mission5_targets()`
- Const: `MISSION5_PAYOUT_CAP = 1400000000`

---

## Cross-Mission Systems

### Rocket Progression
| Rocket | Level | Cost | Range | Cargo | Laser | Unlocked |
|--------|-------|------|-------|-------|-------|----------|
| Starter Rocket 1 | L1 | 1B F | 10 AU | 1x | 10% | M1 start |
| Starter Rocket 2 | L2 | 1.3B F | 120 AU | 2x | 20% | M1 complete |
| Starter Rocket 3 | L3 | 4B F | 1200 AU | 10x | 30% | M3 complete |

### Target Types
- **Asteroids**: Available M1-M5, require L1-L2 rockets
- **Planets**: Available M4+, require L3+ rockets

### Reward Ratios
| Mission | Ratio | Purpose |
|---------|-------|---------|
| M1 | 1.2x | Gentle introduction, guaranteed profit |
| M2 | 1.3x | Reward upgrade investment |
| M3 | 1.3x | Offset scanner build cost |
| M4 | 1.4x | Reward planetary exploration |
| M5 | 1.1x base | Contractor effects provide value |

### Tutorial Progression
1. **M1**: Basic loop (build → launch → mine → return → debrief)
2. **M2**: Upgrade path (better equipment = better results)
3. **M3**: Scanner system (player choice, target discovery)
4. **M4**: Planetary exploration (long-range, rare minerals)
5. **M5**: Contractor system (strategic choice, affinity)

### Gating Mechanisms
- **Scanner**: Hidden until M3 complete
- **Planets**: Hidden until M4 (scanner toggle)
- **Contractors**: Hidden until M5
- **Rockets**: Level-gated by mission completion
- **Targets**: Filtered by mission stage and history

---

## Implementation Checklist

### Code References
- `scene/Scripts/Utils/RocketsManager.gd`: Mission state, targets, progression
- `scene/Scripts/UI/TutorialCoachOverlay.gd`: Tutorial steps and flow
- `scene/Scripts/Earth/MissionDebrief.gd`: Payout and progression
- `scene/Scripts/UI/SatelliteStationPanel.gd`: Scanner behavior
- `scene/Scripts/Earth/LaunchpadSelectorPanel.gd`: Target selection

### Test Coverage
- `scene/tests/run_experience_tests.gd`: Mission progression, gating, rewards
- `scene/tests/run_mining_tests.gd`: Yield calculations, payout ratios
- `scene/tests/run_tutorial_tests.gd`: Tutorial flow validation

### Related Tasks
- task-hcaynf: Gate scanner to M3
- task-x48i3q: Mission selector progression
- task-srnf59: Create mission 3
- task-vergrc: Create mission 4
- task-jom58m: Create mission 5
- task-4r0j05: Mission progression updates

---

## Future Enhancements

### Proposed Improvements
1. **Mission briefing screen**: Pre-launch summary of objectives
2. **Progress tracker UI**: Persistent mission status display
3. **Contextual tutorial**: Mission-specific guidance overlays
4. **Onboarding overlays**: Step-by-step mission walkthroughs
5. **Mission replay**: Ability to replay missions for practice

### Related Tasks
- task-7xdhgi: Mission onboarding overlays
- task-tpl2om: Mission progress tracker
- task-bzx127: Refactor tutorial to be mission-contextual
- task-r7f35q: Mission briefing screen



## CORRECTIONS

### Rocket Costs (Verified from RocketSpecs.gd)
- Starter Rocket 1: 1B F (not 200M)
- Starter Rocket 2: 1.3B F (not 1.5B)
- Starter Rocket 3: 4B F (correct)

### Mission 1 Economics
- SR1 Cost: 1B F
- Reward Ratio: 1.2x
- Expected Return: ~1.2B F (full mine + scrap)

### Mission 2 Economics
- SR2 Cost: 1.3B F
- Reward Ratio: 1.3x
- Expected Return: ~1.69B F (full mine + scrap)


---

## Resolved Definitions (2026-02-27)

Open questions for Level 2/3 mode split, drag/drop scope, exposure formulas, unlock thresholds, and first-release overlays are now defined in:

- @doc/specs/level-2-3-mode-split-and-exposure-formula-specification

This document is the implementation and test reference for those previously unresolved items.
