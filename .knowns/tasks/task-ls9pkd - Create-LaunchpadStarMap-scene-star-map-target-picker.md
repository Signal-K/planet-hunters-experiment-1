---
id: ls9pkd
title: 'Create LaunchpadStarMap scene: star map target picker'
status: done
priority: high
labels:
  - star-map
  - launchpad
  - ui
createdAt: '2026-03-26T09:35:18.486Z'
updatedAt: '2026-03-26T09:57:30.359Z'
timeSpent: 0
assignee: '@me'
---
# Create LaunchpadStarMap scene: star map target picker

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the target card list in the launchpad selector with an interactive star map. Targets placed at sky coords (orbit rings for asteroids, sector grid for TESS planets). Tapping a target selects it and emits selected_target signal. Inherits SpaceMap visual style.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Targets rendered at sky/orbit coords matching SpaceMap layout
- [ ] #2 Asteroid vs planet visually distinct (grey vs green, orbit vs sector)
- [ ] #3 Tapping a target selects it, highlights it, shows inline info strip
- [ ] #4 Info strip shows: name, type, distance AU, fuel cost, TESS disposition if planet
- [ ] #5 Confirm button emits target_confirmed(target_id) signal
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reuse the existing launchpad selector entry point in `scene/Scripts/Earth/LaunchpadSelectorPanel.gd` and replace the target card list with an interactive star-map panel.
2. Base the map layout on the notebook sketch from @task-kh8gvl: solar-system focus first, asteroid belts / rings for local targets, separate placement treatment for planet targets, inline target info strip, confirm action.
3. Reuse coordinate / styling ideas from `scene/Scripts/UI/SpaceMap/SpaceMap.gd` so target placement and visual language stay consistent.
4. Verify selection flow, target persistence, and launch gating still work, then run the relevant Godot tests or focused validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
Replaced the launchpad target card list with a starmap-based picker in `scene/Scripts/Earth/LaunchpadSelectorPanel.gd`.
Added `scene/Scripts/Earth/LaunchpadStarMap.gd` to render a solar-system-first map: asteroid targets on concentric orbit rings, planet/TESS targets in a separate outer-systems panel, blocked targets muted, selected target highlighted.
Selection is now two-step: tap target to preview inline details, then confirm to persist target choice. Info strip shows type, distance AU, estimated fuel cost as range-budget %, ship range, and TESS disposition for planets.
Emits `selected_target(target_id)` on tap and `target_confirmed(target_id)` on confirm so launch flow can stay explicit.
<!-- SECTION:NOTES:END -->

