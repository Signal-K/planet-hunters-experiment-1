---
id: x48i3q
title: Mission selector progression and rocket/target gating (M1-M3)
status: done
priority: high
labels:
  - missions
  - progression
createdAt: '2026-02-17T04:57:10.149Z'
updatedAt: '2026-02-17T05:45:01.860Z'
timeSpent: 801
assignee: '@me'
parent: 4r0j05
---
# Mission selector progression and rocket/target gating (M1-M3)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement progression-aware mission selector and gating behavior from .knowns/assets/IMG_1754.jpeg, .knowns/assets/IMG_1755.jpeg, .knowns/assets/IMG_1756.jpeg. Include pre-selected target in M1, L2 unlock/progression timing, and distance/capability constraints.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission selector reflects available rockets and mission progression state
- [x] #2 M1 target is pre-selected and follows no-scanner flow
- [x] #3 M2 requires/uses L2 rocket progression and same-target richer-yield behavior
- [x] #4 Target list indicates when options are blocked by range/capability
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Stabilize Supabase fetch startup path: defer/retry HTTPRequest kickoff when request returns ERR_UNCONFIGURED/early-init failure (the `Failed to create HTTP request: 3` log).
2. Harden LaunchHUD lookup/connection: prefer real HUD with LaunchButton over empty `LaunchHUDInstance`, and add bounded retry so initial earth_launchpad load binds reliably.
3. Add regression tests in `scene/tests/run_experience_tests.gd` for LaunchHUD resolution preference and/or safe connection path.
4. Run headless test suite (`run_experience_tests.gd` and `run_tutorial_tests.gd`) and update task notes/status.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented from .knowns/assets/IMG_1754.jpeg, .knowns/assets/IMG_1755.jpeg, .knowns/assets/IMG_1756.jpeg
- Added mission progression helpers in RocketsManager (stage, mission count, last completed target, target profile distance/required level, awaiting rocket level).
- Launchpad selector now shows Distance/Required Level/Current Rocket level and blocks out-of-range targets.
- Mission 1 auto-selects first target when none selected. Mission 2 auto-selects last completed target when available.
- Launch action now validates rocket/target compatibility before countdown to prevent bypassing selector gating.
- Verified with headless Godot: run_tutorial_tests.gd and run_experience_tests.gd (pass).

🔄 Reopened from editor repro: harden LaunchHUD/LaunchButton lookup to tolerate node naming variants and ensure show/hide/countdown resolve consistently.

🔄 Reopened: user requested complete rocket-selector UI rebuild (no scroll, full-screen when no awaiting rocket).

✓ Rebuilt Available Rockets selector UI from scratch: removed ScrollContainer, switched to fixed no-scroll full layout with centered large cards and larger create actions. Selector panel now expands to near full-screen when no awaiting rocket exists, and uses compact bounds when awaiting rocket is present.

🔄 Reopened: ultrawide selector/tut overlay alignment pass + selector test coverage updates.

- Updated RocketSelectorUIBuilder to fixed no-scroll card layout with centered cards and larger action affordances.
- Updated LaunchpadSelectorPanel layout mode: near full-screen when no awaiting rocket, compact when awaiting rocket exists.
- Added tests in scene/tests/run_experience_tests.gd:  and .
- Updated scene/tests/TEST_DESCRIPTIONS.md.
- Validation: run_experience_tests.gd (21/21 pass), run_tutorial_tests.gd (2/2 pass).

Correction: added selector layout tests in scene/tests/run_experience_tests.gd (test_rocket_selector_ui_has_no_scroll_container, test_launchpad_selector_panel_fullscreen_without_awaiting).

🔄 Reopened: add editor-only mission skip/jump debug button + automated test coverage.

- Added editor-only debug progression button in launchpad selector () visible only when OS.has_feature('editor').
- Added RocketsManager.debug_complete_mission_for_progression() to simulate mission completion and advance stage safely.
- Added automated test  in scene/tests/run_experience_tests.gd with isolated mission-log path override.
- Validation: run_experience_tests.gd (22/22 pass), run_tutorial_tests.gd (2/2 pass).

Correction: editor-only button label is Debug: Skip Mission. Added test function test_debug_skip_mission_advances_progression in scene/tests/run_experience_tests.gd.

🔧 Launchpad error fix pass (2026-02-17):
- SupabaseClient request startup hardened: deferred kickoff + bounded retry for ERR_UNCONFIGURED ().
- LaunchHUD resolver now prefers HUD node containing LaunchButton, avoiding empty LaunchHUDInstance selection race on first frame.
- Added regression test: test_launch_hud_resolution_prefers_node_with_button in scene/tests/run_experience_tests.gd.
- Validation: run_experience_tests.gd (23/23 pass), run_tutorial_tests.gd (2/2 pass).

Correction: Supabase startup fix targets the error string Failed to create HTTP request: 3 (no functional change; previous note append had shell backtick interpolation).

Follow-up fix: corrected launch_hud.tscn child parent paths from LaunchHUD to . to remove parent-vanished instancing warnings and normalize child names (LaunchButton/CountdownLabel). Re-ran run_experience_tests.gd: 23/23 pass.

Follow-up tweak: _find_launch_hud now returns null when only LaunchHUD* placeholders exist without controls, avoiding false-positive 'LaunchHUD found' logs before real HUD instancing. Validation rerun: run_experience_tests.gd 23/23 pass.
<!-- SECTION:NOTES:END -->

