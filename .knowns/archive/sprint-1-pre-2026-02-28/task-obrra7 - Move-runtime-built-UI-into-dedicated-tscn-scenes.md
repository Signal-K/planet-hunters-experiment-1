---
id: obrra7
title: Move runtime-built UI into dedicated tscn scenes
status: done
priority: high
labels:
  - refactor
  - ui
  - godot
createdAt: '2026-02-19T04:49:49.471Z'
updatedAt: '2026-02-19T04:58:06.232Z'
timeSpent: 475
assignee: '@me'
---
# Move runtime-built UI into dedicated tscn scenes

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Find scripts that construct Control/UI hierarchy at runtime and migrate UI node structure into preauthored scenes so .gd scripts focus on behavior/wiring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All targeted UI scripts stop creating Control hierarchy via new()/add_child during runtime
- [x] #2 Each migrated UI has a dedicated .tscn scene containing the UI node structure
- [x] #3 Existing scene behavior remains functional after migration
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory runtime UI creation across .gd files (Control/Label/Button/etc new + add_child) and map each to existing/new template scenes.
2. Migrate core panel UI constructors to dedicated .tscn assets (TutorialPanel pointer, Launchpad mission guidance overlay, MissionDebrief mineral rows/empty state, Launchpad mission-5 contractor row, legacy SelectorManager row).
3. Replace remaining runtime UI row constructors in transition/preview flows with reusable template scenes where feasible without changing behavior.
4. Validate scene/script links with headless Godot test(s) and targeted grep to confirm removed runtime UI construction in migrated files.
5. Update task notes and AC after verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Replaced runtime UI node construction in scene/Scripts with template scene instantiation.
- Added reusable templates for rows, overlays, drag preview, flash overlay, and generic panel shell.
- Migrated Launchpad mission guidance + tutorial pointer to preauthored scene nodes.
- Updated MissionDebrief, LaunchpadSelectorPanel, SelectorManager, OrbitSalePreview, transition summaries, and AsteroidPreview lists to use template scenes.
- Refactored PanelManager to instantiate GenericStyledPanel template instead of building UI tree in code.

## Verification
- rg scan: no Control/Label/Button/etc `.new()` constructors remain in `scene/Scripts`.
- Passed: `res://tests/run_tutorial_tests.gd`.
- Passed: `res://tests/run_mining_tests.gd`.
<!-- SECTION:NOTES:END -->

