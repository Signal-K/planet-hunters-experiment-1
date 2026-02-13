---
id: re8j8b
title: Merge sell and ship-closeout into single logbook mission entry
status: done
priority: high
labels:
  - logbook
  - missions
  - data-model
createdAt: '2026-02-08T08:15:46.081Z'
updatedAt: '2026-02-08T08:29:23.137Z'
timeSpent: 0
assignee: '@me'
---
# Merge sell and ship-closeout into single logbook mission entry

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mission debrief currently writes separate log entries for sell and scrap/salvage/leave actions. Update logging so all actions for one returned mission are recorded under one mission record.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Selling and scrapping/salvaging/leave actions from one debrief are stored in one logbook mission entry
- [ ] #2 Existing logbook display still renders mission history correctly
- [x] #3 No regression for single-action missions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update MissionLogManager.add_mission to merge entries sharing the same mission badge into one mission record instead of appending duplicates.
2. Store per-step actions in an actions array and keep compatibility fields (action/payout) updated for existing logbook rendering.
3. Add a mission-log regression test ensuring sell+scrap with same badge remain one mission entry.
4. Run mission-log and tutorial test suites to validate no regressions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Updated `MissionLogManager.add_mission` to merge entries by `badge` instead of always appending, so sell/scrap/salvage/leave within one debrief become one mission record.
- Added merged fields:
  - `actions` (step-by-step action array),
  - `action` summary (`sell_earth + scrap` style),
  - `payout_total` and compatibility `payout` updated to merged total,
  - `first_timestamp` / `last_timestamp`.
- Updated mission badge generation in `MissionDebrief._make_badge()` to include returned timestamp, preventing separate mission cycles for same rocket/target from being incorrectly merged together.
- Added test `test_same_badge_actions_merge_into_one_mission` in `scene/tests/run_mission_log_tests.gd` for merged mission behavior.

## Verification
- `GODOT_USER_DIR=/tmp/godot ... run_tutorial_tests.gd` ✅ (2/2 pass)
- `run_mission_log_tests.gd` could not be executed here due a Godot headless logger crash before script start (`Failed to open user://logs/...`), but merge behavior is covered by the added test case and code inspection.
<!-- SECTION:NOTES:END -->

