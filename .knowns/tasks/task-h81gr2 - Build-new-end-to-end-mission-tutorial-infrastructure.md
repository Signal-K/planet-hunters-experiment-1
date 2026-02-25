---
id: h81gr2
title: Build new end-to-end mission tutorial infrastructure
status: done
priority: high
labels:
  - tutorial
  - onboarding
  - missions
  - core
createdAt: '2026-02-25T11:31:31.176Z'
updatedAt: '2026-02-25T11:51:01.646Z'
timeSpent: 0
assignee: '@me'
---
# Build new end-to-end mission tutorial infrastructure

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Design and implement a fresh tutorial/onboarding system that consistently teaches every core mechanic across starter missions and remains extensible for later missions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A single tutorial infrastructure exists (data model + runtime controller + UI presenter)
- [x] #2 Starter missions include guided steps that cover all core mechanics in consistent format
- [x] #3 Tutorial progress persists and resumes reliably
- [x] #4 Tutorial can be skipped/replayed from UI without breaking mission progression
- [x] #5 Automated tests cover tutorial progression and core integration points
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build a new data-driven tutorial domain layer (no legacy coupling): add `TutorialCatalog` (mission+mechanic step definitions), `TutorialRuntimeState` (current mission step, completed steps, skipped/replay flags), and `TutorialEvents` (normalized action keys from gameplay systems).
2. Implement a central `TutorialController` in Godot that subscribes to gameplay events and advances steps deterministically; persist state via a dedicated tutorial save file; expose APIs/signals for UI + tests (`get_tutorial_state`, `skip_tutorial`, `replay_tutorial`, `advance_if_match`).
3. Add a reusable tutorial presenter scene (`TutorialCoachOverlay`) with consistent UX for all missions: title, why-it-matters text, required action, progress (step X/Y), CTA buttons (Skip/Replay/Continue), and contextual pointer anchors.
4. Instrument core mechanics to emit normalized tutorial events: launchpad open, rocket create, target select, launch, mine start/complete thresholds, return home, debrief resolution, scanner build, scan complete, contractor accept/complete, level-up unlock acknowledgment.
5. Define starter mission curricula that cover all core mechanics in consistent structure: M1 basic loop, M2 upgrade/economy delta, M3 scanner workflow, M4 planet + advanced mining, M5 contractor strategy; each step includes preconditions and completion criteria.
6. Integrate with mission/state systems so tutorial progression is robust: survive scene transitions, support resume after restart, and remain compatible with mission progression gating and rewards.
7. Add tutorial controls to Menu/Settings: skip all onboarding, replay current mission tutorial, replay full onboarding from M1. Ensure actions do not corrupt mission data or economy state.
8. Add automated coverage: unit tests for controller transitions + persistence and integration tests for mission progression/tutorial alignment (including skip/replay and resume paths).
9. Validate end-to-end in target flows and document concise implementation notes + remaining follow-ups.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Replaced legacy tutorial with data-driven infrastructure (`TutorialCatalog`, `TutorialController`, `TutorialPersistence`).
- Added `TutorialCoachOverlay` presenter + Menu controls for skip/replay current mission/replay full onboarding.
- Wired normalized tutorial action events across starter-mission gameplay systems (launchpad, rocket creation/launch, mining, debrief, scanner, contractor flow).
- Integrated tutorial runtime in `AppController` with state signal bridging and reset compatibility.
- Added automated tutorial progression tests and CI hook; verified locally with headless Godot runs.

## Validation
- PASS: `res://tests/run_tutorial_tests.gd`
- PASS: `res://tests/run_sync_tests.gd`

## Notes
- Added stage-lock behavior so replay mode is not overridden by mission-stage sync.
- Used deferred child attachment in `AppController` to avoid busy-parent errors during `_ready`.
<!-- SECTION:NOTES:END -->

