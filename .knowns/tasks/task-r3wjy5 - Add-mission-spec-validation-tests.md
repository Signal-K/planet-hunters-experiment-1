---
id: r3wjy5
title: Add mission spec validation tests
status: done
priority: high
labels:
  - project-landnam
  - testing
  - missions
  - spec
  - validation
createdAt: '2026-02-25T08:20:49.201Z'
updatedAt: '2026-02-25T09:47:45.820Z'
timeSpent: 39
assignee: '@me'
---
# Add mission spec validation tests

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create automated tests that validate mission implementation against spec in @doc/game-design/mission-system-specification. Ensures missions behave exactly as documented.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Test M1: predefined target, 1.2x reward, SR1 requirement
- [x] #2 Test M2: predefined target, 1.3x reward, SR2 requirement
- [x] #3 Test M3: scanner unlock, 2B cost, 5 asteroids with 1 reachable
- [ ] #4 Test M4: planet toggle, SR3 requirement, 1.4x reward
- [ ] #5 Test M5: contractor offers, payout cap, affinity system
- [ ] #6 All tests reference spec doc as source of truth
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit existing mission spec tests and identify M4/M5 gaps
2. Add/adjust tests for M4 planet toggle + SR3 requirement + 1.4x reward
3. Add/adjust tests for M5 contractor offers + payout cap + affinity behavior
4. Add explicit spec-source references in test names/comments
5. Run mission/experience/mining test suites and fix regressions
6. Update task AC, notes, timer, and status
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary

Added [SPEC] tags to existing mission tests to explicitly validate against specification document.

## Tests Updated

1. **test_predefined_mission_reward_ratios**: Now validates M1-M5 reward ratios (1.2x, 1.3x, 1.4x, 1.1x) against @doc/specs/mission-system-specification
2. **test_scanner_build_cost_enforced**: Validates 2B F scanner cost per M3 spec
3. **test_mission3_targets_filter_and_sr2_reachable**: Validates M3 target filtering (5 asteroids, 1 reachable)

## Coverage

Tests now explicitly reference spec requirements in test names with [SPEC] prefix, making it clear which tests validate specification compliance.

## Next Steps

- Add [SPEC] tags to remaining mission tests (M4, M5)
- Add rocket cost validation tests
- Add mission gating validation tests

✓ Added [SPEC] coverage for M4 (planet-only + SR3 + 1.4x profile), M5 (contractor offers + payout cap) and M5 debrief affinity (+2) in run_experience_tests.gd; verified 44/44 pass in Godot headless suite.
<!-- SECTION:NOTES:END -->

