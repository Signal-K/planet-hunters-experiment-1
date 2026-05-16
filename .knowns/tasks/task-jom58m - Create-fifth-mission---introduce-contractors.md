---
id: jom58m
title: Create fifth mission - introduce contractors
status: done
priority: medium
labels:
  - project-landnam
  - subcontractors
  - contractors
  - missions
  - mission5
  - tutorial
  - progression
createdAt: '2026-02-19T11:27:21.000Z'
updatedAt: '2026-02-25T08:45:01.366Z'
timeSpent: 0
assignee: '@me'
---
# Create fifth mission - introduce contractors

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The fifth mission will start off with the two non-default contractors requesting a random allotment of minerals that they want you (the player) to mine. The user picks which contractor they want to accept the mission from (one contractor will provide discounts on ship construction and the other will provide more money for minerals; part of the affinity system), and then they start the mission. The user is informed of a recommended target that would have the right amount of minerals - it would be an asteroid, not a planet - and a recommended rocket (now, they can pick any rocket, but the total payout would be maximum F 1.4B, so make sure the user is informed that they'll lose money if they purchase a rocket that is more than that value. They will only need an l1 mining laser - available on an l1 ship - for this fifth mission). At the end of the mission, they get the payout and they see their overall level and affinity with the contractor increase. There is no penalty to the affinity for the contractor they "ignored"
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Mission 5 contractor mission state/model in `RocketsManager` (offer generation, contractor selection, payout cap and contractor effects).
2. Update launchpad selector and rocket purchase flow for Mission 5 (contractor acceptance, recommended target/rocket messaging, payout-cap warning, stage-5 asteroid targeting).
3. Update mission debrief payout/affinity handling to apply Mission 5 contractor terms and keep ignored contractor affinity unchanged.
4. Add and run automated tests for Mission 5 contractor offer/selection and purchase+payout rules; run mining/experience suites.
5. Record implementation notes, stop time tracking, and close task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added Mission 5 contractor mission model to `RocketsManager` with persisted offer state, contractor options, selected-contractor persistence, asteroid-only target pool, recommended target/rocket, and payout cap (1.4B).
- Added contractor effect helpers in `RocketsManager`:
  - Rocketlab: 20% ship purchase discount (`get_mission5_purchase_cost`).
  - Astroforge: payout bonus with cap enforcement (`apply_mission5_payout_terms`).
- Updated Launchpad target selection for stage 5:
  - Uses Mission 5 asteroid targets.
  - Renders contract brief with random requested mineral allotment.
  - Requires contractor acceptance before target selection.
  - Shows recommended target and payout-cap warning when rocket cost exceeds cap.
- Updated RocketSelector purchase flow to apply mission-stage contractor discount and show payout-cap risk in confirmation.
- Updated MissionDebrief to:
  - Use selected Mission 5 contractor when available.
  - Apply Mission 5 payout terms (bonus + 1.4B cap).
  - Increase selected contractor affinity on completion (no penalty for ignored contractor).
  - Persist subcontractor info into mission log entries.
- Added Mission 5 tests in `run_experience_tests.gd` for offer creation/selection and purchase+payout rule enforcement.

## Validation
- `run_experience_tests.gd`: 46/46 pass
- `run_mining_tests.gd`: 16/16 pass
- `run_mission_log_tests.gd`: could not run due Godot logger crash in this environment (signal 11 in `RotatedFileLogger::rotate_file`).



Spec Reference: @doc/specs/mission-system-specification (Mission 5 design)
<!-- SECTION:NOTES:END -->

