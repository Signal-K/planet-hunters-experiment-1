---
id: sovnvn
title: Update SpaceMap scene to be its own tscn file
status: done
priority: medium
labels:
  - scenes
  - scripts
  - tscn
  - map
  - ui
  - mission-select
createdAt: '2026-02-19T11:06:37.000Z'
updatedAt: '2026-02-19T03:23:11.268Z'
timeSpent: 770
assignee: '@me'
---
# Update SpaceMap scene to be its own tscn file

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A lot of scenes/buttons like the SpaceMap are, right now, just a bunch of `.gd` files that create behaviour/UIs at runtime. I want these scenes to be `tscn` files, e.g. `SpaceMap.tscn`, where all UI elements are part of the Godot scene. the `.gd` files should be used for creating behaviour, functionality, etc....not for UI. Identify all `.gd` scripts that follow this incorrect pattern and fix, please
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Identify all scripts that still create panel/card/button UI nodes at runtime (scene-level and list/card templates).
2. Add reusable .tscn templates for matching dynamic rows/cards and add missing fixed containers to existing panel scenes.
3. Refactor scripts to instantiate templates and bind data/behavior only (no structural UI creation with *.new()).
4. Update/adjust tests for affected flows and run the targeted experience/supabase suites.
5. Check AC, add completion notes, stop timer, and mark task done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Migrated runtime-built UI structures to reusable tscn templates under scene/Scenes/UI/Templates/.
- Refactored matching scripts to instantiate templates and bind data/signals only (behavior in gd, structure in scenes).
- Added missing fixed scene nodes where scripts previously created containers at runtime (e.g. LaunchedList, TargetsSection, control-station roadmap containers).
- Added scene/Scenes/UI/RocketSelectorOverlay.tscn and switched New Mission rocket-selector launch to scene instantiation.

## Files updated
- scene/Scripts/UI/NewMissionPanel.gd, scene/Scripts/UI/NewMissionLaunchList.gd, scene/Scripts/UI/NewMissionAnnotations.gd
- scene/Scripts/UI/SatelliteStationPanelList.gd, scene/Scripts/UI/SatelliteStationPanel.gd
- scene/Scripts/UI/SubcontractorsPanel.gd, scene/Scripts/UI/ControlStationPanel.gd, scene/Scripts/UI/MenuPanel.gd
- scene/Scripts/Earth/RocketSelectorUIBuilder.gd, scene/Scripts/Earth/LaunchpadSelectorPanel.gd
- scene/Scenes/UI/NewMissionPanel.tscn, scene/Scenes/UI/ControlStationPanel.tscn, scene/Scenes/Earth/earth_launchpad.tscn
- New templates in scene/Scenes/UI/Templates/ plus scene/Scenes/UI/RocketSelectorOverlay.tscn

## Verification
- No further tests run per user instruction (environment crashes when running headless Godot tests).
<!-- SECTION:NOTES:END -->

