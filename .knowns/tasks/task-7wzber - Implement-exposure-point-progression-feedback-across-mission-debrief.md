---
id: 7wzber
title: Implement exposure-point progression feedback across mission debrief
status: done
priority: high
labels:
  - progression
  - exposure
  - debrief
createdAt: '2026-02-27T07:57:03.069Z'
updatedAt: '2026-02-27T08:19:13.834Z'
timeSpent: 0
assignee: '@me'
parent: 02buhl
---
# Implement exposure-point progression feedback across mission debrief

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use Exposure Points as the primary progression currency and show objective completion, exposure gained, and next unlock progress in mission feedback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Debrief shows objective completion state, exposure gained, and next unlock progress every mission.
- [x] #2 Exposure rewards and thresholds are applied consistently for current implemented levels.
- [x] #3 Progress state persists and is visible after reload/session restore.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add mission debrief progression feedback builder (objective completion, exposure gain, next unlock progress) and show it in status area on load and after resolving actions.
2. Keep exposure progression consistent by deriving awarded exposure from existing mission-stage reward function and reusing AppController XP thresholds for next-level progress.
3. Make feedback resilient on reload/session restore by reading persisted AppController XP/level values whenever debrief renders labels.
4. Extend mission debrief tests to assert progression feedback text includes objective completion and unlock progress context.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added debrief progression feedback text to always include objective completion state, exposure gain context, and next unlock progress.
- Reused existing mission exposure reward calculation (`RocketsManager.get_mission_exposure_reward`) and AppController XP thresholds (`get_xp_required_for_next_level`) to keep progression math consistent.
- Updated debrief action outcomes (sell/keep/archive/scrap/leave) to display awarded exposure with progression context.
- Kept reload/session visibility by deriving unlock progress from persisted AppController state each time labels render.
- Added mission log/debrief test asserting objective/exposure/unlock lines appear in debrief feedback.

## Verification
- /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_mission_log_tests.gd
- ./run_tests_clean.sh
<!-- SECTION:NOTES:END -->

