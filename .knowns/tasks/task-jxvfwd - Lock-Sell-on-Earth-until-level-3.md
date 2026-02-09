---
id: jxvfwd
title: Lock Sell on Earth until level 3
status: done
priority: high
labels:
  - balance
  - progression
  - ui
createdAt: '2026-02-08T08:02:58.597Z'
updatedAt: '2026-02-08T08:06:41.652Z'
timeSpent: 0
assignee: '@me'
---
# Lock Sell on Earth until level 3

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Raise Earth cargo sale unlock requirement from level 2 to level 3 and keep all unlock text/UI consistent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sell on Earth action is disabled for player levels 1-2
- [ ] #2 Sell on Earth action is enabled starting at level 3
- [x] #3 Unlock messaging in mission/menu/satellite UI reflects level 3
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update Earth sale unlock gate constant in `scene/Scripts/Earth/MissionDebrief.gd` from 2 to 3 so button lock/enabled behavior matches new requirement.
2. Update UI unlock descriptors in `scene/Scripts/UI/MenuPanel.gd` and `scene/Scripts/UI/SatelliteStationPanel.gd` to show level 3 for Sell on Earth.
3. Run a quick targeted test suite (`run_tutorial_tests.gd`) to confirm no script regressions after the progression text/constant changes.
<!-- SECTION:PLAN:END -->

