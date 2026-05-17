---
id: uvmvbf
title: Add mining mechanics and obstacles
status: done
priority: medium
labels:
  - project-landnam
  - gameplay
  - mining
createdAt: '2026-02-24T14:31:49.172Z'
updatedAt: '2026-02-25T00:27:45.733Z'
timeSpent: 90
parent: z0iqyr
---
# Add mining mechanics and obstacles

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add gameplay depth: fuel management, heat buildup, asteroid hazards (craters, rocks), combo system for consecutive hits
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fuel/energy system
- [x] #2 Heat management (overheat = cooldown)
- [x] #3 Environmental hazards
- [x] #4 Combo multiplier system
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Added Mechanics

### Vertical Movement
- **UP/DOWN arrows** or mobile buttons to move rocket
- Rocket constrained to safe zone (y: 150-350)
- Dodge obstacles while mining

### Obstacles
1. **Craters**: Deep depressions in terrain (visual hazard)
2. **Boulders**: Solid rocks jutting from surface - collision damages fuel
3. **Gas Vents**: Periodic steam bursts - collision damages fuel

### Collision System
- Hit obstacle = lose fuel + break combo
- 1 second invulnerability after hit (flashing sprite)
- Obstacles scale with difficulty level

### Enhanced Combo
- Combo displayed separately in gold text
- Breaks on hit OR when heat reaches zero
- Higher combos = exponentially higher scores

### Difficulty Scaling
- Higher levels = more obstacles (15% + 5% per level)
- Seeded RNG for consistent terrain per level

### Mobile Controls
- UP/DOWN buttons (left side)
- FIRE button (right side)
- Same mechanics as desktop
<!-- SECTION:NOTES:END -->

