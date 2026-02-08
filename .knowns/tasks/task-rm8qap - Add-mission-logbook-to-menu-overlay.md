---
id: rm8qap
title: Add mission logbook to menu overlay
status: done
priority: medium
labels:
  - godot
  - ui
  - menu
  - mission-log
createdAt: '2026-02-08T01:56:16.295Z'
updatedAt: '2026-02-08T02:53:59.583Z'
timeSpent: 258
assignee: '@me'
---
# Add mission logbook to menu overlay

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a Logbook button at the top of MenuPanel that opens a formatted list of all missions from mission_logs history.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Menu overlay has a Logbook button in the header area
- [x] #2 Clicking Logbook opens a panel/list containing full mission history entries
- [x] #3 Mission history rows are clearly formatted and include all recorded fields
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend MenuPanel scene with Logbook button and overlay panel
2. Wire MenuPanel script to open/close and render mission history
3. Format mission rows to show all fields clearly
4. Update mission log tests for full-field coverage
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added header Logbook button + modal overlay with scrollable mission cards in MenuPanel

✓ Updated run_mission_log_tests.gd to verify full mission entry field preservation

⚠️ Reopened: run_mission_log_tests currently failing (cannot write user://mission_logs.json in headless run); logbook behavior not yet test-green.

✓ MissionLogManager now supports test path overrides; run_mission_log_tests uses isolated res:// test log and passes.

Validation: tests/run_mission_log_tests.gd PASS (4/4).
<!-- SECTION:NOTES:END -->

