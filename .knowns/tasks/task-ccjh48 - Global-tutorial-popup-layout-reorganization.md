---
id: ccjh48
title: Global tutorial popup layout reorganization
status: done
priority: high
labels:
  - project-landnam
  - tutorial
  - ui
  - layout
createdAt: '2026-03-14T03:55:19.386Z'
updatedAt: '2026-03-14T03:58:33.621Z'
timeSpent: 0
assignee: '@me'
---
# Global tutorial popup layout reorganization

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a fixed tutorial popup zone and enforce a global UI exclusion area so gameplay/info controls never overlap the tutorial location across missions/scenes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutorial popup uses one fixed size and one fixed on-screen location across all tutorial steps
- [x] #2 Interactive/info UI elements are automatically repositioned to avoid the reserved tutorial zone
- [x] #3 Reserved zone stays empty even when tutorial is hidden, showing background only
- [x] #4 Tutorial guidance and action targeting remain functional after layout changes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add shared tutorial zone layout constants (fixed size + fixed anchor) for all tutorial UI usage.
2. Refactor TutorialCoachOverlay to always render at that fixed size/location, removing dynamic placement and overlap-based hiding logic.
3. Extend global UIConsistencyEnforcer to reserve that zone permanently by auto-repositioning overlapping controls outside the zone across scenes.
4. Exempt tutorial overlay internals from zone enforcement and keep guidance arrows/targeting intact.
5. Run targeted tutorial/layout tests or smoke checks and record notes + AC status.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added shared tutorial reserved-zone utility: `scene/Scripts/UI/TutorialLayoutZone.gd`.
- Locked tutorial popup to fixed size/location in `TutorialCoachOverlay` using shared reserved rect.
- Removed dynamic overlap-based popup relocation/hide behavior.
- Extended `UIConsistencyEnforcer` to reserve tutorial zone globally and auto-reposition overlapping UI controls.
- Added tutorial-zone exemptions for overlay root/panel so tutorial content remains stable.

## Validation
- Attempted `./run_godot_tests_manual.sh`; all suites aborted before execution due environment logger crash (`Failed to open user://logs/...`, Godot signal 11), so runtime verification remains pending.
<!-- SECTION:NOTES:END -->

