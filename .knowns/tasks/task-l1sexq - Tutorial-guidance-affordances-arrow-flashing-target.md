---
id: l1sexq
title: 'Tutorial guidance affordances: arrow + flashing target'
status: done
priority: medium
labels:
  - project-landnam
  - tutorial
  - ux
  - godot
createdAt: '2026-02-27T09:38:55.765Z'
updatedAt: '2026-02-27T09:43:44.393Z'
timeSpent: 152
assignee: '@me'
---
# Tutorial guidance affordances: arrow + flashing target

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add pulsing directional guidance and flashing click targets in TutorialCoachOverlay so users can clearly identify required interaction points.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tutorial overlay shows animated directional arrow guidance to current required target
- [ ] #2 Current target structure/button visibly flashes while its tutorial step is active
- [ ] #3 Guidance visuals restore cleanly when step changes or tutorial hides
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend tutorial targeting helper to expose current target node and rect together.
2. Add pulse animation for guidance arrow/highlight in TutorialCoachOverlay.
3. Flash active target CanvasItem while step is active and restore on change/hide.
4. Run mission/tutorial test suite and record results.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added pulsing arrow/line/highlight animation to TutorialCoachOverlay.
- Added flashing target affordance on active tutorial targets with safe restore on step change/hide/exit.
- Extended TutorialCoachTargeting with target-node lookup and rect helper to support flashing the resolved target node.
- Prioritized visible structure nodes for launchpad/scanner target selection guidance.

- Added tutorial targeting regression tests in scene/tests/run_tutorial_tests.gd for structure-node preference and launch-button resolution.
<!-- SECTION:NOTES:END -->

