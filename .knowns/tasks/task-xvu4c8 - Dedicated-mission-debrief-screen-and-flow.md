---
id: xvu4c8
title: Dedicated mission debrief screen and flow
status: done
priority: high
labels:
  - project-landnam
  - missions
  - debrief
  - ui
createdAt: '2026-02-17T04:57:10.149Z'
updatedAt: '2026-02-17T05:10:46.110Z'
timeSpent: 42
assignee: '@me'
parent: 4r0j05
---
# Dedicated mission debrief screen and flow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add dedicated mission debrief flow as specified in .knowns/assets/IMG_1755.jpeg (formal ticket note) and consistent with overall notes in .knowns/assets/IMG_1754.jpeg + .knowns/assets/IMG_1756.jpeg.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Completing a mission transitions into a dedicated debrief screen
- [x] #2 Debrief presents mission outcome summary without breaking current progression
- [x] #3 Flow back to mission selection/next step is deterministic
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validated dedicated debrief flow against .knowns/assets/IMG_1755.jpeg (formal debrief requirement) with context from .knowns/assets/IMG_1754.jpeg and .knowns/assets/IMG_1756.jpeg.
- Confirmed return transitions route to res://Scenes/Earth/mission_debrief.tscn (dedicated debrief step).
- Added deterministic empty-state handling in MissionDebrief.gd: when returned mission context is missing, actions are locked and UI explicitly routes player to continue via Back.
- Re-ran run_experience_tests.gd headless: 19/19 pass.
<!-- SECTION:NOTES:END -->

