---
id: p83j42
title: Control Station mission roadmap + gated progression list
status: done
priority: high
labels:
  - project-landnam
  - missions
  - control-station
  - ui
  - progression
createdAt: '2026-02-17T05:48:46.589Z'
updatedAt: '2026-02-25T08:45:02.217Z'
timeSpent: 1163
assignee: '@me'
parent: 4r0j05
---
# Control Station mission roadmap + gated progression list

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement Control Station mission list behavior from mission/local-list notes so players can see upcoming missions without skipping locked progression. Source notes: .knowns/assets/IMG_1754.jpeg, .knowns/assets/IMG_1755.jpeg, .knowns/assets/IMG_1756.jpeg.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Control Station shows mission roadmap (current + upcoming) with clear locked/unlocked states
- [x] #2 Players cannot open/skip locked missions from Control Station unless using explicit debug skip action
- [x] #3 List reflects progression changes immediately (including after debug skip)
- [x] #4 Automated test coverage added for roadmap gating behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix mission completion source of truth: stop deriving progression from mission log row count; use explicit progression counter in RocketsManager state and increment only on mission completion or debug skip.
2. Rework ControlStationPanel mission cards into click-to-start flow: only current mission is actionable; completed/upcoming are non-actionable; no skip controls.
3. Wire mission click transition: selecting current mission opens earth_launchpad and stores pending mission guidance.
4. Add launchpad guidance with arrow/instructions: consume pending mission guidance in LaunchpadScene and drive TutorialPanel pointer/instruction override to show start steps.
5. Update/add tests for sequential gating + next-mission correctness + mission guidance plumbing, then run run_experience_tests.gd and run_tutorial_tests.gd.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Control Station mission roadmap from .knowns/assets/IMG_1754.jpeg, .knowns/assets/IMG_1755.jpeg, .knowns/assets/IMG_1756.jpeg.
- ControlStation now opens res://Scenes/UI/ControlStationPanel.tscn via UIManager.show_structure_panel.
- Added roadmap rendering in ControlStationPanel with progression statuses: completed/current/upcoming (non-interactive; no skip action exposed).
- Kept debug skip exclusive to editor-only launch selector button path.
- Added test test_control_station_roadmap_gating_states in scene/tests/run_experience_tests.gd.
Validation: run_experience_tests.gd 24/24 pass; run_tutorial_tests.gd 2/2 pass.

Follow-up: added Next Mission highlight card to ControlStationPanel above roadmap, driven by build_next_mission_highlight_data() and synced to progression state. Added test_control_station_next_mission_highlight_updates in run_experience_tests.gd. Validation: run_experience_tests.gd 25/25 pass; run_tutorial_tests.gd 2/2 pass.

🔄 Reopened from user feedback: Control Station roadmap showing incorrect completed state; requested click-to-start mission flow to launchpad with instructions/arrows and strict sequential completion enforcement.

Sequential progression overhaul from feedback: mission completion now uses explicit state counter () instead of mission-log row count. Added badge-deduped completion increment in MissionDebrief and debug skip path. ControlStationPanel now has current-mission Start button only (completed/upcoming read-only), enforces current-only start, and opens launchpad while storing pending mission guidance id. LaunchpadScene now consumes pending mission guidance and shows dynamic instruction + arrow to Create/Select/Launch until mission starts. Added tests: pending mission guidance roundtrip + updated roadmap/highlight tests to use explicit counter. Validation: run_experience_tests.gd 26/26 pass, run_tutorial_tests.gd 2/2 pass.

Correction: sequential progression now keyed by mission_progress_completed state field (previous note had shell interpolation issue due backticks).

Follow-up fixes from overlap/progression feedback: RocketSelector dialog lifecycle hardened to avoid freed dialog_text crash and busy add_child errors (dialogs attached deferred to stable host). Launchpad selector now gates Mission Target list until a rocket is awaiting launch, removing selector overlap pressure and keeping no-scroll flow. ControlStationPanel orbit list now includes rockets awaiting launch and in-flight launches with target labels. LaunchpadScene hides TutorialPanel while mission guidance overlay is active to prevent instruction overlap. Added progression safety test: starting a mission does not increment completed progression. Full test run completed across all headless runners: tutorial, sync, annotation model, experience, supabase, mining, visual quality, mission log (all passing).



Spec Reference: @doc/specs/mission-system-specification (Mission roadmap)
<!-- SECTION:NOTES:END -->

