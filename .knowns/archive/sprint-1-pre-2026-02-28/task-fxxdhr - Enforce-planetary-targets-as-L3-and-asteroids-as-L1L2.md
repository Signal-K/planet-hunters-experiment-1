---
id: fxxdhr
title: Enforce planetary targets as L3+ and asteroids as L1/L2
status: done
priority: high
labels:
  - balance
  - progression
  - targets
  - rockets
createdAt: '2026-02-19T05:18:06.647Z'
updatedAt: '2026-02-25T08:45:01.781Z'
timeSpent: 123
assignee: '@me'
---
# Enforce planetary targets as L3+ and asteroids as L1/L2

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update target profiling so all planet targets are outside the solar system and require at least L3 rockets, while asteroid targets are within inner/outer solar system bands requiring only L1 or L2 rockets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All planet targets resolve to required rocket level >= 3
- [x] #2 All asteroid targets resolve to required rocket level 1 or 2 only
- [x] #3 UI target details reflect the updated distance/required-level rules for planets vs asteroids
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update RocketsManager target profile rules: planets map to out-of-solar-system distances with required_level >= 3; asteroids map to inner/outer solar distances with required_level 1-2 only.
2. Adjust mission-specific fallback profile branches so no asteroid path requires L3+ and planet paths stay L3+.
3. Verify UI uses these profiles (scanner list + launchpad details already profile-driven) and run regression tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Reworked target profile rules in RocketsManager to enforce planet vs asteroid distance/range tiers.
- Planets now always map to out-of-solar-system bands and require L3 minimum.
- Asteroids now map to inner/outer solar bands only and require L1/L2.
- Updated mission-stage specific profile branches (M3/M4/M5) to conform to the new level constraints.
- Updated experience tests to assert the new mission profile expectations.

## Validation
- Passed: res://tests/run_experience_tests.gd (46/46)
- Passed: res://tests/run_tutorial_tests.gd (2/2)



Spec Reference: @doc/specs/mission-system-specification (Target level requirements)
<!-- SECTION:NOTES:END -->

