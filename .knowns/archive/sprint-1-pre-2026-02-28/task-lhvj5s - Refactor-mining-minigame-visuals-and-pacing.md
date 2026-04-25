---
id: lhvj5s
title: Refactor mining minigame visuals and pacing
status: done
priority: high
labels:
  - refactor
  - mining
  - visuals
createdAt: '2026-02-24T14:39:09.675Z'
updatedAt: '2026-02-25T08:45:17.084Z'
timeSpent: 151
---
# Refactor mining minigame visuals and pacing

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move visual elements to scene file, create solid terrain, slow down gameplay, use existing rocket sprites
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Visual elements in .tscn not .gd
- [x] #2 Solid continuous terrain surface
- [x] #3 Slower pacing with better visibility
- [x] #4 Use RocketSpriteHelper for rocket visuals
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Refactoring Complete

### Visual Elements in Scene
- Rocket: AnimatedSprite2D (uses RocketSpriteHelper)
- Terrain: Polygon2D for solid surface
- Minerals/Obstacles: Node2D containers
- UI: Proper hierarchy with VBoxContainers
- All visuals defined in .tscn, not created in code

### Solid Terrain
- Single Polygon2D for continuous surface
- 3000px wide (was 2000px)
- Smaller height variance (40 vs 80)
- Solid gray asteroid/planet surface

### Slower Pacing
- Scroll speed: 80 (was 150) - 47% slower
- Fuel drain: 8 (was 10) - 20% less drain
- Longer terrain: 3000px (was 2000px) - 50% more time
- Larger segments: Better visibility of upcoming obstacles

### Rocket Sprites
- Uses RocketSpriteHelper.apply_orbit_sprite()
- Stage 2 animated sprites for SR1/SR2
- Accepts rocket_id parameter in start_mining()
- Scales to 0.25 for proper size



## Second Pass - Proper Implementation

### Fuel Fixed
- Drain rate: 2.0 (was 8) = 75% slower drain
- Scroll speed: 50 (was 80) = 38% slower
- Terrain: 4000px (was 3000px) = 33% longer
- Fuel refill per mineral: 8 (was 6)
- **Result**: ~80 second gameplay (was <5 seconds)

### All Visuals in Scene
- 12 mineral deposits (Polygon2D with metadata)
- 4 boulder obstacles (Polygon2D with metadata)
- Solid terrain surface (single Polygon2D)
- Script only reads metadata, no visual creation
- Scene has 20+ objects, not 3



Spec Reference: @doc/specs/mining-minigame-system-specification
<!-- SECTION:NOTES:END -->

