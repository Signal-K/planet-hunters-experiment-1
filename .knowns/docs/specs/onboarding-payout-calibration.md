---
title: Onboarding payout calibration
createdAt: '2026-03-07T01:33:24.618Z'
updatedAt: '2026-03-07T01:33:24.802Z'
description: Defines first-mission generosity and follow-up normalization targets
tags:
  - economy
  - onboarding
  - missions
---
# Onboarding Payout Calibration

## Goals
- First mission should feel clearly rewarding (~150% of rocket cost).
- Early follow-up missions should converge back toward normal economy (~115%).

## Rules
- First mission (before any completed mission is recorded):
  - enforce minimum net payout floor at `rocket_cost * 1.5`.
- Subsequent early missions:
  - nudge payout toward `rocket_cost * 1.15` target rather than hard snapping.

## Implementation
- Add `RocketsManager.calibrate_onboarding_payout(raw_net, rocket_id)`
- Apply in `MissionDebrief._sell` before balance credit.

## Notes
- Mission-5 contractor payout terms still apply in their own flow.
