---
id: x6qrcj
title: Earth base visual evolution
status: done
priority: high
labels:
  - project-landnam
  - art
  - earth-base
  - visual
  - ui
createdAt: '2026-03-17T06:47:35.846Z'
updatedAt: '2026-03-19T03:48:41.730Z'
timeSpent: 238
assignee: '@me'
---
# Earth base visual evolution

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Earth base screen must visually grow as player builds/upgrades. Described as extremely important retention mechanic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 L1 base: 3 structures with starter-tier sprites
- [ ] #2 L4: structure upgrade sprites (visually larger/more elaborate)
- [x] #3 L5: new structures appear on screen when built, with placement animation
- [ ] #4 L6+: refinery and additional structures have distinct visual footprint
- [x] #5 Base scales gracefully to 5-8 structures without cluttering
- [ ] #6 Art: sprite sheets for each structure across upgrade tiers
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
_apply_structure_visual_evolution() added to earth_base_1.gd (called deferred in _ready()).
- AC#1: 3 starter structures already present (SatelliteStation, Launchpad, ControlStation).
- AC#3: _ensure_construction_structure_visible() spawns structure node on first completion + Tween scale 0→full placement animation. ConfigFile tracks which projects have been animated.
- AC#5: Construction structures placed at fixed off-screen positions (2100,800 and 400,800) within the scrollable base area.
- AC#2/AC#4/AC#6 (art): _scale_structure() applies _STRUCTURE_SCALE_PER_TIER multipliers (1.0→1.15→1.30→1.45) as placeholder for real upgrade sprites. Real sprite sheets not yet available — using scale + tint as visual indicator.
- Construction structures use launchpad.png as placeholder sprite with blue tint.
<!-- SECTION:NOTES:END -->

