---
id: mv7aeq
title: Make mining minigame scene-driven
status: done
priority: high
labels:
  - project-landnam
  - refactor
  - architecture
createdAt: '2026-02-24T14:47:34.421Z'
updatedAt: '2026-02-25T08:45:17.292Z'
timeSpent: 39
---
# Make mining minigame scene-driven

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move all configuration, visual setup, and structure into .tscn files. Scripts should only handle input/physics/state
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Scene file defines all visual elements
- [x] #2 Script only handles: input, scrolling, collision, scoring
- [x] #3 No visual creation in code
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Scene-Driven Architecture

### Script Reduced to 80 Lines
- Only handles: input, scrolling, collision detection, scoring
- No visual creation, no setup code
- Uses @export for all configuration
- Direct node path access ($Rocket, $Terrain, etc.)

### Scene File Contains
- All visual elements (20+ objects)
- All minerals with metadata
- All obstacles with metadata  
- Complete UI hierarchy
- Terrain surface polygon
- Rocket AnimatedSprite2D
- Laser Line2D

### Configuration via @export
- scroll_speed, fuel_drain_rate, max_fuel
- heat_per_shot, heat_cooldown, max_heat
- rocket_speed
- All tunable in editor

### Script Responsibilities ONLY
- Process input (keyboard/mouse)
- Update scroll offset
- Check laser hits via metadata
- Check collisions via metadata
- Update UI text/bars
- Emit signals



Spec Reference: @doc/specs/mining-minigame-system-specification
<!-- SECTION:NOTES:END -->

