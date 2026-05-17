---
id: srnf59
title: Create mission 3
status: done
priority: medium
labels:
  - project-landnam
  - mission3
  - level2
  - missions
  - narrative
  - tutorial
  - scanner
  - asteroids
  - targets
  - anomalies
createdAt: '2026-02-18T22:44:54.000Z'
updatedAt: '2026-02-25T08:45:00.942Z'
timeSpent: 0
assignee: '@me'
---
# Create mission 3

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mission 3 consists of users having to use the scanner to find asteroids (which are the only target available at this point); it will only show targets that haven't been targeted by the user yet. It should show their relative distance, only one of the five should be shown to be within the range of the starterrocket2 rocket, which is what the user is using. The user selects this target to go mining. Other than that, same behaviour as before. Estimated reward value should be 1.3* cost of rocket.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. For Mission 3, filter scanner/launch targets to untargeted asteroids only.
2. Ensure Mission 3 target set exposes five candidates with one SR2-reachable profile and clear distance/level details.
3. Wire mission-stage-aware target sourcing in launch selector and scanner panel fallback path.
4. Add/adjust tests for Mission 3 filtering and reachability profile behavior; run suites.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Implemented Mission 3 target filtering to untargeted asteroids and fixed Mission 3 profile shaping: five candidates with one SR2-reachable target, others blocked by level/range. Added test_mission3_targets_filter_and_single_sr2_reachable.



Spec Reference: @doc/specs/mission-system-specification (Mission 3 design)
<!-- SECTION:NOTES:END -->

