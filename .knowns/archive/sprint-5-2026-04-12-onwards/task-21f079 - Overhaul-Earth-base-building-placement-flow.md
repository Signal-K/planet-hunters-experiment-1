---
id: 21f079
title: Overhaul Earth base building placement flow
status: done
priority: high
labels:
  - ui
  - earth-base
  - missions
  - build-flow
createdAt: '2026-04-24T02:02:47.621Z'
updatedAt: '2026-04-24T06:50:04.178Z'
timeSpent: 0
---
# Overhaul Earth base building placement flow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Gate Control Station and Scanner Station building behind mission progression and move structure building into a guided placement flow: player chooses Build, then Earth base, then structure, with Mission 2 explicitly introducing the mechanic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Control Station and Scanner Station cannot be built before the intended mission progression gates
- [x] #2 Mission 2 introduces building placement as part of the flow
- [x] #3 Build flow requires selecting Build, then Earth base, then the structure to place
- [x] #4 Earth base tests cover the new build gating and placement sequence
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current Earth base build overlay, Control Station build path, Scanner Station build path, and tutorial CTA shortcuts.
2. Implement a staged build flow: Build -> select Earth Base -> select structure, with mission-stage gating for Control Station and Scanner Station.
3. Route Mission 2 and Mission 4 tutorial/build actions through the placement flow instead of direct state toggles.
4. Add or update tests for build gating, placement sequence, and tutorial integration.
5. Verify with focused Earth base and structure suites.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added scene-owned Earth-base build flow overlay and option-card templates.
- Routed Build, tutorial CTAs, and scanner pre-build interaction through Build -> Earth Base -> structure.
- Enforced mission gates: Control Station after Mission 1, Scanner Station after Mission 3.
- Converted Earth-base progression cards to scene-owned nodes in earth_base_1.tscn and reduced script to binding/state.
- Added Earth-base regressions for build gating, placement sequence, tutorial CTA routing, and scene-owned progression cards.

## Verification
- Godot --headless --path scene -s tests/run_earth_base_unlock_tests.gd
- Godot --headless --path scene -s tests/run_structure_tests.gd
- Godot --headless --path scene -s tests/run_tutorial_tests.gd
<!-- SECTION:NOTES:END -->

