---
id: 0060wi
title: 'Godot codebase hygiene sweep (duplicates, dead scenes, regressions)'
status: done
priority: high
labels:
  - project-landnam
  - godot
  - cleanup
  - stability
  - tech-debt
createdAt: '2026-03-07T01:39:23.906Z'
updatedAt: '2026-03-07T01:44:42.172Z'
timeSpent: 210
assignee: '@me'
---
# Godot codebase hygiene sweep (duplicates, dead scenes, regressions)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Comprehensive pass across scene/ scripts to identify duplicate code/scenes/objects, remove redundancies safely, fix bugs/regressions found, and run Godot test suite with remediation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Duplicate scene/script/object artifacts are identified and cleaned or archived with no broken references
- [x] #2 Critical bugs/errors discovered during sweep are fixed
- [x] #3 Godot tests are executed and failures addressed or documented
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run duplicate scanners for Godot scene/script/assets and flag safe cleanup candidates
2. Run static checks + knowns validation and fix high-confidence defects
3. Execute Godot tests/smoke suite and fix regressions
4. Re-run validation/tests, then document findings and residuals
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added duplicate-task cleanup script (scripts/knowns/dedupe_tasks.mjs) and applied it; archived duplicate ID task files under .knowns/duplicates/tasks. ✓ Removed unreferenced broken legacy Godot scenes/scripts referencing missing assets: Scenes/tv.tscn, Scenes/Level/house.*, Scenes/Objects/(blob|bed|tree|simple_object).*, Scenes/UI/item_info.tscn + Scripts/UI/item_info.gd, Scenes/UI/tool_ui*.tscn, Scenes/vfx/flash* and Scenes/World/background.tscn. ✓ Fixed runtime scene warning by reducing RocketDragPreview z_index from 10000 to 200. ✓ Fixed stale ext_resource UID warnings in StarterRocket1.tscn and NewMissionPanel.tscn. ✓ Ran full scene smoke load over res://Scenes and re-ran ./run_all_tests.sh (Godot + JS): all tests passed. Residual non-blocking warnings remain from transition scene style overrides and test-runner resource-leak warning at exit.
<!-- SECTION:NOTES:END -->

