---
id: z0iqyr
title: Create side-scrolling asteroid mining minigame
status: done
priority: high
labels:
  - gameplay
  - mining
  - minigame
createdAt: '2026-02-24T14:31:41.902Z'
updatedAt: '2026-02-25T00:27:23.966Z'
timeSpent: 117
---
# Create side-scrolling asteroid mining minigame

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace timing minigame with side-scrolling surface mining where player flies over procedural asteroid terrain and mines colored mineral regions
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Procedural asteroid surface generation
- [x] #2 Scrolling terrain with mineral regions
- [x] #3 Rocket flies above surface with mining laser
- [x] #4 Mobile touch controls + keyboard support
- [x] #5 Score/collection mechanics
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation

Created side-scrolling asteroid surface mining minigame:

### Core Mechanics
- **Scrolling terrain**: Procedurally generated asteroid surface scrolls right-to-left
- **Mineral regions**: Colored patches represent different minerals (Iron, Nickel, Cobalt, Platinum, Silicates)
- **Mining laser**: Hold SPACE/CLICK to fire laser downward at minerals
- **Fuel system**: Limited fuel drains over time, run out = game over
- **Heat management**: Laser generates heat, overheat = forced cooldown
- **Combo system**: Consecutive hits multiply score, broken when laser cools

### Gameplay Flow
1. Rocket flies at fixed height above scrolling surface
2. Player fires laser at colored mineral regions below
3. Successful hits collect minerals and add to score
4. Each hit gives small fuel bonus and increases combo
5. Missing breaks combo when heat reaches zero
6. Complete when terrain ends or fuel depletes

### Visual Elements
- Stage 2 rocket sprite with fins and flame
- Colored mineral deposits on terrain
- Blue/red laser beam (color changes with heat)
- Heat and fuel bars
- Score with combo multiplier display

### Mobile Support
- Touch controls: FIRE button bottom-right
- Auto-detects mobile platform
- Same mechanics as desktop

### Integration
- Replaces timing minigame in AsteroidPreview
- Score bonus affects mining yield (score/1000 = bonus multiplier)
- Returns collected minerals dictionary + score

### Files
- `scene/Scripts/UI/SidescrollMining.gd`
- `scene/Scenes/UI/SidescrollMining.tscn`
- Updated AsteroidPreview integration
- Updated test_mining.gd
<!-- SECTION:NOTES:END -->

