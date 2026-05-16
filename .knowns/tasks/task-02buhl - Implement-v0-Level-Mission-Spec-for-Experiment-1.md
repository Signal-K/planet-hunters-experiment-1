---
id: 02buhl
title: Implement v0 Level & Mission Spec for Experiment 1
status: done
priority: high
labels:
  - project-landnam
  - missions
  - progression
  - spec
  - experiment1
createdAt: '2026-02-27T07:56:30.465Z'
updatedAt: '2026-02-27T08:27:50.899Z'
timeSpent: 0
assignee: '@me'
---
# Implement v0 Level & Mission Spec for Experiment 1

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the 2026-01-15 and 2026-01-19 level/mission design draft with a tutorial-first flow, scanner-driven target selection, fallback generation, and exposure-point progression. Source: user-provided PlanetHunters Experiment1 - Level & Mission Spec (v0).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Level 1 guided launch flow is fully playable end-to-end with debrief and progression unlock.
- [x] #2 Level 2 structured exploration supports limited mission variants and reduced guidance.
- [x] #3 Level 3 open operations supports route/mode choice and expanded debrief stats.
- [x] #4 Mission starts always provide a playable fallback scenario when generation constraints fail.
- [x] #5 Exposure gain and next unlock progress are shown clearly in mission feedback.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
Implemented and validated the Experiment 1 v0 mission/level spec across child tasks:
- Level 1 guided route + debrief/progression: task-hl3d5b
- Level 2 structured variants + reduced guidance: task-9w14kp
- Scanner-required targeting flow: task-7z1z11
- Mission fallback generation and launch continuity: task-r36co4
- Exposure + unlock progress feedback in debrief: task-7wzber
- Open operations mode/route + advanced debrief stats: task-6vt91o
- Resolved spec open questions (mode split/formulas/overlays): task-j05hgn

## Verification
- run_structure_tests.gd, run_mission_log_tests.gd, run_experience_tests.gd all passing in latest run set.
<!-- SECTION:NOTES:END -->

