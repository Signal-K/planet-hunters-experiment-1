---
id: hl3d5b
title: Implement Level 1 Guided Launch tutorial route
status: done
priority: high
labels:
  - project-landnam
  - missions
  - tutorial
  - level1
createdAt: '2026-02-27T07:56:48.505Z'
updatedAt: '2026-02-27T08:44:38.099Z'
timeSpent: 274
assignee: '@me'
parent: 02buhl
---
# Implement Level 1 Guided Launch tutorial route

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure Level 1 remains a strict, low-failure tutorial route with explicit structure introduction, single route mission execution, and guaranteed valid first mission completion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Level 1 enforces a single guided route with constrained interactions and minimal branching.
- [x] #2 Player completes one full mission cycle with clear prompts from briefing through debrief.
- [x] #3 Level 1 rewards exposure points and reliably unlocks Level 2.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Enforced strict Level 1 single-route target gating via stage-aware selectable target checks.
- Updated Level 1 tutorial and mission briefing copy to reinforce guided route and debrief completion outcomes.
- Added mission exposure reward helper and applied mission exposure award on debrief completion paths with user-facing status text.
- Added regression coverage for Level 1 route strictness and mission exposure scaling.

## Validation
- ./run_tests_clean.sh (pass)
- godot --headless --path scene --script tests/run_structure_tests.gd (pass, elevated)
- godot --headless --path scene --script tests/run_tutorial_tests.gd (pass, elevated)

Closed and moved to done per user request (2026-02-27).
<!-- SECTION:NOTES:END -->

