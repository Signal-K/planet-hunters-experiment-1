---
title: Spec Task Coverage Matrix
createdAt: '2026-02-25T09:58:31.984Z'
updatedAt: '2026-02-27T08:26:47.616Z'
description: >-
  Coverage map from spec requirements to implementation tasks and validation
  tests
---
# Spec Task Coverage Matrix

This matrix maps active specification requirements to completed implementation tasks and validation tests.

## Mission System Spec (@doc/specs/mission-system-specification)

| Requirement | Coverage Evidence | Validation | Status |
|---|---|---|---|
| M1 predefined target + 1.2x + SR1 | Spec-aligned implementation completed (historical task IDs archived) |run_experience_tests.gd [SPEC] | Covered |
| M2 predefined target + 1.3x + SR2 | Spec-aligned implementation completed (historical task IDs archived) |run_experience_tests.gd [SPEC] | Covered |
| M3 scanner unlock/cost/target filtering | Spec-aligned implementation completed (historical task IDs archived) |run_experience_tests.gd [SPEC] | Covered |
| M4 planet flow + SR3 + 1.4x | Spec-aligned implementation completed (historical task IDs archived) |run_experience_tests.gd [SPEC] | Covered |
| M5 contractor flow + payout cap + affinity | Spec-aligned implementation completed (historical task IDs archived) |run_experience_tests.gd [SPEC] | Covered |
| Mission briefings per mission | Spec-aligned implementation completed (historical task IDs archived) |Launchpad briefing gate + persisted seen-state | Covered |
| Mission progress tracker UI | Spec-aligned implementation completed (historical task IDs archived) |MissionProgressTracker component | Covered |
| Mission-context tutorials + per-mission dismiss | Spec-aligned implementation completed (historical task IDs archived) |TutorialCoachOverlay + AppController mission dismiss state | Covered |
| Mission flowcharts (M1-M5) | Spec-aligned implementation completed (historical task IDs archived) |@doc/specs/mission-flowchart-diagrams | Covered |

## Level Progression Spec (@doc/specs/level-progression-and-unlocks-specification)

| Requirement | Coverage Evidence | Validation | Status |
|---|---|---|---|
| Rocket unlock levels (SR1/SR2/SR3) | Spec-aligned implementation completed (historical task IDs archived) |run_experience_tests.gd | Covered |
| Scanner gating by mission progression | Spec-aligned implementation completed (historical task IDs archived) |run_experience_tests.gd | Covered |
| Mission/level based target gating | Spec-aligned implementation completed (historical task IDs archived) |run_experience_tests.gd | Covered |

## Mining Minigame Spec (@doc/specs/mining-minigame-system-specification)

| Requirement | Coverage Evidence | Validation | Status |
|---|---|---|---|
| Interactive mining loop and rewards | Spec-aligned implementation completed (historical task IDs archived) |run_mining_tests.gd + run_experience_tests.gd | Covered |
| Scene-driven mining architecture | Spec-aligned implementation completed (historical task IDs archived) |Scene/UI runtime refactor + tests | Covered |

## User Flow & Citizen Science Spec (@doc/specs/user-flow-and-citizen-science-specification)

| Requirement | Coverage Evidence | Validation | Status |
|---|---|---|---|
| Earth base structure flow | Spec-aligned implementation completed (historical task IDs archived) |Launchpad/Earth interactions + experience suite | Covered |
| Scan → select target → launch flow | Spec-aligned implementation completed (historical task IDs archived) |run_experience_tests.gd | Covered |

## Notes

- Coverage status reflects current active specs and implementation tasks in Knowns.
- Validation currently relies on Godot experience/missions coverage plus JS unit tests in this environment.



## Addendum (2026-02-27): Resolved Design Definitions

| Requirement | Coverage Evidence | Validation | Status |
|---|---|---|---|
| Level 2/3 mode split + drag/drop scope + exposure formulas + overlay minimums | @doc/specs/level-2-3-mode-split-and-exposure-formula-specification | Structure + mission log suites include open-operations persistence and advanced debrief assertions | Covered |
