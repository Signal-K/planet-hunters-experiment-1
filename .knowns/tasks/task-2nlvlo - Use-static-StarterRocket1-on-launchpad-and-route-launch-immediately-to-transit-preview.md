---
id: 2nlvlo
title: >-
  Use static StarterRocket1 on launchpad and route launch immediately to transit
  preview
status: done
priority: high
labels:
  - project-landnam
  - godot
  - launchpad
  - preview
  - routing
  - rocket
createdAt: '2026-02-09T10:11:10.500Z'
updatedAt: '2026-02-09T12:22:47.418Z'
timeSpent: 0
assignee: '@me'
---
# Use static StarterRocket1 on launchpad and route launch immediately to transit preview

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove stage-1 launchpad/earth launch animation for starterrocket1 and switch to transit/transport scene immediately on Launch; keep stage-2 animation in preview flow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Launchpad/earth launch uses static StarterRocket1.png with no stage-1 animation
- [ ] #2 Pressing Launch immediately routes to transit/transport scene
- [ ] #3 Stage-2 animation in preview/transit remains unchanged
- [ ] #4 StarterRocket1 launchpad visual scale is reduced to fit within launchpad structure
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace stage-1 starter rocket visuals with static StarterRocket1.png in launchpad-related scene/script references.
2. Remove launchpad stage-1 launch animation flow and delayed preview timer from LaunchpadLaunchButton.gd.
3. On Launch press, keep mission/state writes, then route immediately to outbound transit scene (rocket_transit.tscn).
4. Verify RocketTransit stage-2 animation path remains unchanged and run targeted sanity grep checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Removed stage-1 launch animation path from LaunchpadLaunchButton and switched launch routing to immediate outbound transit scene.
- Replaced starterrocket1 launchpad/selector textures with static StarterRocket1.png.
- Kept stage-2 transit/preview animation unchanged (RocketSpriteHelper stage2 frames).

## Files
- scene/Scripts/Earth/LaunchpadLaunchButton.gd
- scene/Scenes/Vehicles/StarterRocket1.tscn
- scene/Scenes/Earth/earth_launchpad.tscn
- scene/Scripts/Earth/RocketSelector.gd

✓ Reduced StarterRocket1 launchpad scale (Sprite2D 6 -> 2.5) to fit launchpad

✓ Further reduced StarterRocket1 launchpad scale (Sprite2D 2.5 -> 1.6)

✓ Tuned StarterRocket1 launchpad fit: Sprite2D scale 1.6 -> 1.2; fixed launchpad position to (-110,-120) in spawn/restore/fallback paths

✓ Launchpad-only anchor adjusted up: STARTERROCKET1_LAUNCHPAD_POS (-110,-120) -> (-110,-150) across spawn/restore/fallback
<!-- SECTION:NOTES:END -->

