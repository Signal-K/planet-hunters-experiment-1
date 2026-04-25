---
id: l97pzx
title: >-
  Tutorial overlay: wrong replay buttons shown on fresh game, and overlapping
  mission panels
status: done
priority: high
labels:
  - tutorial
  - ux
  - coach-overlay
  - mission-2
  - regression
createdAt: '2026-04-23T10:15:02.042Z'
updatedAt: '2026-04-23T10:27:44.020Z'
timeSpent: 0
assignee: '@me'
---
# Tutorial overlay: wrong replay buttons shown on fresh game, and overlapping mission panels

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
See screenshot (image: /Users/scroobz/.claude/image-cache/c3040fdc-2b80-4837-bae9-e25746b9b393/3.png).

Two issues visible:

1. The tutorial coach overlay is showing 'Replay Mission' and 'Replay All' buttons even though nothing has been started or played — these should only appear after the player has already seen/completed a step, not on a fresh game state.

2. There is too much overlap — the Scanner (Mission 4) coach panel and the 'Build Control Station' (Mission 2) panel are both showing at the same time on the same screen, creating a confusing stack of instruction panels.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Replay Mission / Replay All buttons are hidden when the current mission step has not yet been started by the player
- [x] #2 Only one tutorial/mission panel is visible at a time — overlapping panels resolved
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add tutorial-state signal for whether the current mission guide has actually been started, based on current step index / per-stage completed steps or actions.
2. Remove Replay All from the tutorial coach overlay entirely; keep only Replay Mission and hide it until the current mission guide has already started.
3. Move base build-step CTAs into the coach overlay for both Control Station and Scanner Station, then hide Earth-base progression cards whenever an active tutorial step is visible.
4. Add focused Godot tests for fresh/current-stage replay visibility state and preserved build-gate behavior.
5. Run the relevant Godot tutorial/structure test suites, then update AC/notes if passing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added current_mission_started tutorial state and gated Replay Mission behind it.
- Removed Replay All from coach overlay, settings menu, and navigation menu.
- Hid Earth-base progression cards while an active tutorial coach step is visible; build-gate CTAs now stay in the coach overlay.
- Added focused tutorial and structure tests.

## Verification
- /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --path scene --script tests/run_tutorial_tests.gd
- /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --path scene --script tests/run_structure_tests.gd
<!-- SECTION:NOTES:END -->

