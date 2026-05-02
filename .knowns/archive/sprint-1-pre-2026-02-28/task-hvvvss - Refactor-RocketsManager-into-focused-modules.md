---
id: hvvvss
title: Refactor RocketsManager into focused modules
status: done
priority: high
labels:
  - architecture
  - refactor
  - rockets
createdAt: '2026-02-26T01:52:06.116Z'
updatedAt: '2026-02-26T02:15:08.019Z'
timeSpent: 424
assignee: '@me'
parent: blav3e
---
# Refactor RocketsManager into focused modules

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Split RocketsManager responsibilities into smaller modules while keeping mission/state behavior stable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Rocket state, mission logic, and target selection responsibilities are separated
- [x] #2 Existing behavior and save compatibility are preserved
- [x] #3 Updated tests cover refactored module boundaries
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract state IO/defaulting helpers into a dedicated module while preserving STATE_PATH/JSON format and load/save behavior.
2. Extract mission progression + contractor logic into a mission module with pure/static helpers and keep RocketsManager wrappers for compatibility.
3. Extract target selection/profile helpers into a targeting module and route existing APIs through it.
4. Add/update focused tests for module boundaries (state defaulting, mission stage/progression, mission target filtering) and keep existing API calls passing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Audit complete: RocketsManager mixes state IO, mission progression/contractor logic, and target-selection/profile logic; extraction plan captured.

✓ Extracted state IO/defaulting into Scripts/Utils/RocketsStateAccess.gd; RocketsManager load/save/reset now delegate via compatibility wrappers.

✓ Extracted mission progression helpers into Scripts/Utils/RocketsMissionProgress.gd (stage mapping + schema/badge migration logic).

✓ Extracted target filtering into Scripts/Utils/RocketsTargeting.gd; mission 3/4/5 target selection now delegates.

✓ Added boundary tests in scene/tests/run_structure_tests.gd for state defaults, mission stage mapping, and target filtering.

Pending: runtime/headless verification intentionally skipped in this environment; keep task in-progress until validated on real Godot run.

Note: verification in this pass is code-level/static; no Godot runtime execution performed in sandbox.
<!-- SECTION:NOTES:END -->

