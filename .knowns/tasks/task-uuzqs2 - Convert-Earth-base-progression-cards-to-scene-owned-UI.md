---
project: Experiment 1/Landnam
id: uuzqs2
title: Convert Earth base progression cards to scene-owned UI
status: done
priority: high
labels:
  - project-landnam
  - ui
  - earth-base
  - missions
createdAt: '2026-04-24T02:01:14.885Z'
updatedAt: '2026-05-08T10:30:54.238Z'
timeSpent: 0
assignee: '@me'
---

[← Back to Index](../INDEX.md)

# Convert Earth base progression cards to scene-owned UI

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move the Earth base progression and active-mission card layouts out of earth_base_1.gd and into .tscn scene files so they are editable in Godot and consistent with the scene-owned UI rule.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Active mission card layout lives in a .tscn scene/template
- [x] #2 Control station, scanner station, next mission, and star map cards use scene-owned layouts
- [x] #3 earth_base_1.gd binds data into existing scene/template nodes instead of constructing those cards in code
- [x] #4 Earth base unlock and structure tests cover the scene-owned card flow
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Identify the remaining progression/build card logic still owned by earth_base_1.gd.
2. Move Earth Base card presentation/binding into a dedicated scene-owned UI script/template.
3. Update earth_base_1.gd to delegate to that scene-owned component instead of styling/configuring cards inline.
4. Extend Earth Base structure tests around the delegated card flow and rerun focused Godot suites.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added EarthBaseProgressionCards scene-owned controller and attached it to UILayer/ProgressionCards. ✓ Moved Earth Base card show/hide/configure logic out of earth_base_1.gd into the scene-backed controller. ✓ Added Earth Base unlock coverage for the scene-owned controller root. ✓ Verified run_earth_base_unlock_tests.gd and run_structure_tests.gd both pass after delegation.

✓ All ACs verified complete per prior session notes. EarthBaseProgressionCards controller + scene-owned card layouts in place. Tests pass.
<!-- SECTION:NOTES:END -->

