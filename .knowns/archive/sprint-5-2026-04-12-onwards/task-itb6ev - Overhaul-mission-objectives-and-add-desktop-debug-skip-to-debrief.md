---
id: itb6ev
title: Overhaul mission objectives and add desktop debug skip to debrief
status: done
priority: high
labels:
  - debug
  - missions
  - debrief
  - desktop
  - testing
createdAt: '2026-04-23T10:35:03.503Z'
updatedAt: '2026-04-23T12:31:01.960Z'
timeSpent: 6491
assignee: '@me'
---
# Overhaul mission objectives and add desktop debug skip to debrief

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce a first-class mission objective model for active missions, then use it to support a desktop/editor-only Cmd+E debug shortcut that completes the active mission according to its objective definition and opens the debrief. The model must support mining and non-mining missions without hard-coded assumptions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cmd+E on desktop/editor only skips an active begun mission to debrief
- [x] #2 Debug completion satisfies that mission's objective requirements, including mining orders when present
- [x] #3 Non-mining missions are handled without injecting fake mining requirements
- [x] #4 No effect when no mission has begun or on non-desktop exports
- [x] #5 Active missions persist a structured objective payload describing objective type and requirements
- [x] #6 Mining-order objectives can be synthesized as complete for debug skip, including collected/requested minerals
- [x] #7 Non-mining objectives can be synthesized as complete without fake mineral cargo
- [x] #8 Cmd+E on desktop/editor only skips an active begun mission to debrief using the objective resolver
- [x] #9 Cmd+E has no effect when no mission has begun or when running non-desktop/web export
- [x] #10 Mission 1 debrief handoff recomputes after completion and routes to Control Station build step
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define a small mission objective contract in a reusable utility (e.g. MissionObjectiveResolver): objective type, requirements, debug completion payload, and debrief metadata.
2. Wire launch creation to persist the objective payload onto each mission record. For current content this maps contractor/trip mining orders to mining_order objectives and supports no_cargo/progress-only objectives for non-mining cases.
3. Refactor AsteroidPreview return/debrief payload construction to read the mission objective where possible, keeping existing starter/trip contractor fields for backwards compatibility.
4. Add a RocketsManager/AppController debug completion path that finds the latest active mission, asks the objective resolver for a completed payload, sets returned_mission, removes the active mission, records tutorial progress, and changes to mission_debrief_v2.
5. Bind Cmd+E in AppController with desktop/editor gating and no-op behavior for web/mobile/no-active-mission.
6. Add tests for objective creation, mining-order debug completion, non-mining completion, shortcut gating/no-op behavior, and debrief compatibility.
7. Run targeted debug, mission flow, debrief, and structure tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added MissionObjectiveResolver and persisted structured objective payloads on active missions.
- Added RocketsManager/AppController debug completion path and Cmd+E desktop/editor shortcut to send active missions to mission_debrief_v2.
- Preserved debrief compatibility by carrying mission_objective/objective_result alongside existing mining/starter/trip payload fields.
- Fixed Mission 1 debrief handoff: recomputes after mission completion and routes to Build Control Station, with no immediate Launchpad instruction.
- Added focused debug shortcut/objective tests and hardened debrief test state reset.

## Verification
- PASS: tests/run_mission_debrief_v2_tests.gd
- PASS: tests/run_debug_jump_tests.gd
- PASS: tests/run_structure_tests.gd (pre-existing Unicode/resource-leak warnings still emitted)
- PASS: tests/run_mission_e2e_flow_tests.gd
- PARTIAL: tests/run_tutorial_tests.gd passes 8/9; remaining failure is existing mission-started state expectation, unrelated to objective/debug path.
<!-- SECTION:NOTES:END -->

