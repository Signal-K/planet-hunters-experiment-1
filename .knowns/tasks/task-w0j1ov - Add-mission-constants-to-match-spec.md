---
id: w0j1ov
title: Add mission constants to match spec
status: done
priority: medium
labels:
  - project-landnam
  - refactor
  - missions
  - spec
  - constants
createdAt: '2026-02-25T08:20:49.408Z'
updatedAt: '2026-02-25T08:43:10.877Z'
timeSpent: 23
assignee: '@me'
---
# Add mission constants to match spec

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure all mission-related constants in code match the spec document. Create single source of truth for mission parameters that references spec.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission reward ratios match spec (1.2x, 1.3x, 1.3x, 1.4x, 1.1x)
- [x] #2 Rocket costs match spec (200M, 1.5B, 4B)
- [x] #3 Scanner build cost matches spec (2B)
- [x] #4 Mission 5 payout cap matches spec (1.4B)
- [x] #5 Add code comments referencing spec doc sections
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary

Added comprehensive spec references to all mission constants in RocketsManager.gd.

## Changes

1. **Added section header**: "Mission System Constants" with spec reference
2. **Scanner cost**: Added comment explaining M3 unlock requirement
3. **Reward ratios**: Added inline comments for each mission explaining purpose per spec
4. **Target counts**: Added comments for M3/M4/M5 target selection behavior
5. **Payout cap**: Added comment explaining M5 economic balance
6. **Contractor offers**: Added comments for each contractor effect

## Verification

All constants match @doc/specs/mission-system-specification:
- ✅ Scanner cost: 2B F
- ✅ M1 reward: 1.2x
- ✅ M2 reward: 1.3x  
- ✅ M4 reward: 1.4x
- ✅ M5 reward: 1.1x base
- ✅ M5 payout cap: 1.4B F
- ✅ Rocketlab discount: 20%
- ✅ Astroforge bonus: 1.15x
<!-- SECTION:NOTES:END -->

