---
id: wwyaez
title: First mission reward bonus (150% payout)
status: done
priority: medium
labels:
  - economy
  - balance
  - onboarding
createdAt: '2026-03-01T16:16:06.012Z'
updatedAt: '2026-03-07T01:34:01.687Z'
timeSpent: 47
assignee: '@me'
---
# First mission reward bonus (150% payout)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Calibrate first mission economics to feel generous. Current target is ~115% of rocket cost. Add a first-mission multiplier so new players feel rewarded before the loop tightens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 First mission mining payout yields ~150% of rocket cost
- [x] #2 Subsequent missions normalise back toward 115%
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add payout calibration helper in RocketsManager for onboarding missions
2. Guarantee first completed mission payout floor near 150% of rocket cost
3. Nudge subsequent early payouts toward 115% target
4. Validate mission debrief scene load and close task
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added RocketsManager.calibrate_onboarding_payout(raw_net, rocket_id): first mission enforces 1.5x rocket-cost floor; subsequent early missions are nudged toward 1.15x target. Applied in MissionDebrief._sell before crediting player balance. Mission debrief scene validated headlessly.
<!-- SECTION:NOTES:END -->

