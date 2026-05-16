---
id: 8njliw
title: Update rough earnings from mining in the early game
status: done
priority: medium
labels:
  - project-landnam
  - mining
  - earnings
  - tutorial
  - behaviour
  - balance
  - minerals
  - selling
createdAt: '2026-02-16T22:38:17.000Z'
updatedAt: '2026-02-25T00:27:07.739Z'
timeSpent: 1097
assignee: '@me'
---
# Update rough earnings from mining in the early game

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In the early game, as long as the user mines the maximum amount they can from a target (based on the strength of the mining laser (how much it can extract) and the capacity), they should net around 115% of the original price of the rocket, as long as they also salvage/scrap the rocket too at the end of the mission.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Full mining + scrap yields ~115% of rocket cost
- [x] #2 Tests validate early game economics
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Centralize rocket balance inputs (cost, speed/range multipliers, mining/cargo multipliers) in a shared config utility.
2. Tune early-game economy so full mining + scrap on Starter Rocket 1 yields roughly 115% of rocket price.
3. Add/adjust tests for payout and mining/output scaling to lock expected economics.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added shared rocket specs utility for cost/salvage/speed/range/cargo/mining multipliers.
- Tuned mineral base pricing so full SR1 mining + 20% scrap lands near ~115% total return.
- Added tests for early-game 115% target and mining/cargo multipliers.

## Validation
- `cd /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/scene && /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --script res://tests/run_mining_tests.gd 2>&1`
- `cd /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/scene && /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --script res://tests/run_experience_tests.gd 2>&1`
- `cd /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/scene && /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --script res://tests/run_mission_log_tests.gd 2>&1`
<!-- SECTION:NOTES:END -->

