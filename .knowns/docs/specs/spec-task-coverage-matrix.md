---
title: Spec Task Coverage Matrix
createdAt: '2026-02-25T09:58:31.984Z'
updatedAt: '2026-02-25T09:58:50.877Z'
description: >-
  Coverage map from spec requirements to implementation tasks and validation
  tests
---
# Spec Task Coverage Matrix

This matrix maps active specification requirements to completed implementation tasks and validation tests.

## Mission System Spec (@doc/specs/mission-system-specification)

| Requirement | Task Coverage | Validation | Status |
|---|---|---|---|
| M1 predefined target + 1.2x + SR1 | @task-r3wjy5, @task-w0j1ov | run_experience_tests.gd [SPEC] | Covered |
| M2 predefined target + 1.3x + SR2 | @task-r3wjy5, @task-w0j1ov | run_experience_tests.gd [SPEC] | Covered |
| M3 scanner unlock/cost/target filtering | @task-r3wjy5, @task-hcaynf, @task-tkj44s | run_experience_tests.gd [SPEC] | Covered |
| M4 planet flow + SR3 + 1.4x | @task-r3wjy5, @task-r7f35q | run_experience_tests.gd [SPEC] | Covered |
| M5 contractor flow + payout cap + affinity | @task-r3wjy5, @task-r7f35q | run_experience_tests.gd [SPEC] | Covered |
| Mission briefings per mission | @task-r7f35q | Launchpad briefing gate + persisted seen-state | Covered |
| Mission progress tracker UI | @task-tpl2om | MissionProgressTracker component | Covered |
| Mission-context tutorials + per-mission dismiss | @task-bzx127 | TutorialPanel + AppController mission dismiss state | Covered |
| Mission flowcharts (M1-M5) | @task-32sidu | @doc/specs/mission-flowchart-diagrams | Covered |

## Level Progression Spec (@doc/specs/level-progression-and-unlocks-specification)

| Requirement | Task Coverage | Validation | Status |
|---|---|---|---|
| Rocket unlock levels (SR1/SR2/SR3) | @task-w0j1ov, @task-r3wjy5 | run_experience_tests.gd | Covered |
| Scanner gating by mission progression | @task-hcaynf, @task-r3wjy5 | run_experience_tests.gd | Covered |
| Mission/level based target gating | @task-x48i3q, @task-r3wjy5 | run_experience_tests.gd | Covered |

## Mining Minigame Spec (@doc/specs/mining-minigame-system-specification)

| Requirement | Task Coverage | Validation | Status |
|---|---|---|---|
| Interactive mining loop and rewards | @task-6wikfp, @task-lhvj5s, @task-r3wjy5 | run_mining_tests.gd + run_experience_tests.gd | Covered |
| Scene-driven mining architecture | @task-mv7aeq, @task-0w9v28 | Scene/UI runtime refactor + tests | Covered |

## User Flow & Citizen Science Spec (@doc/specs/user-flow-and-citizen-science-specification)

| Requirement | Task Coverage | Validation | Status |
|---|---|---|---|
| Earth base structure flow | @task-sz2gwu, @task-0w9v28 | Launchpad/Earth interactions + experience suite | Covered |
| Scan → select target → launch flow | @task-r3wjy5, @task-r7f35q | run_experience_tests.gd | Covered |

## Notes

- Coverage status reflects current active specs and implementation tasks in Knowns.
- Validation currently relies on Godot experience/missions coverage plus JS unit tests in this environment.
