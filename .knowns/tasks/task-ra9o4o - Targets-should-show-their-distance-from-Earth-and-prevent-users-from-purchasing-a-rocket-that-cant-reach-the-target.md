---
id: ra9o4o
title: >-
  Targets should show their distance from Earth and prevent users from
  purchasing a rocket that can't reach the target
status: done
priority: high
labels:
  - limits
  - rockets
  - mining
  - surveying
  - scanner
  - launchpad
createdAt: '2026-02-19T13:08:22.000Z'
updatedAt: '2026-02-19T05:14:41.689Z'
timeSpent: 310
assignee: '@me'
---
# Targets should show their distance from Earth and prevent users from purchasing a rocket that can't reach the target

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Scanner target entries display Earth distance and required rocket level
- [x] #2 Rocket purchase is blocked when selected target exceeds rocket range level
- [x] #3 Player receives explicit out-of-range message including distance and required/current levels
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Show target distance from Earth in scanner target list items by using RocketsManager target profiles (distance AU + required level) for each anomaly.
2. Enforce reachability during rocket purchase in Launchpad: block purchase when selected target requires higher rocket level than the selected rocket.
3. Surface clear player messaging in purchase dialog/info text when blocked (include target distance and required/current rocket levels).
4. Run targeted regression checks (tutorial/mining tests + grep sanity) and summarize behavior changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added target profile metadata (distance + required level) to scanner list subtitles.
- Added purchase gate in RocketSelector that blocks creating a rocket if selected target requires a higher rocket level.
- Added explicit player message when blocked, including target distance and required/current rocket levels.

## Validation
- Passed: res://tests/run_tutorial_tests.gd
- Passed: res://tests/run_mining_tests.gd
- Verified new strings/hooks via rg in RocketSelector + SatelliteStationPanelList.
<!-- SECTION:NOTES:END -->

