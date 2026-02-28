---
id: obfh19
title: Fix mission debrief showing no returned mission after successful return
status: done
priority: high
labels:
  - bug
  - mission-state
  - debrief
createdAt: '2026-02-27T06:42:59.962Z'
updatedAt: '2026-02-27T08:44:39.563Z'
timeSpent: 215
assignee: '@me'
---
# Fix mission debrief showing no returned mission after successful return

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After a mission is launched from Earth, mines, and returns home, mission debrief incorrectly shows 'no returned mission found'. This indicates mission return/debrief state is not persisted or queried correctly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After a completed launch-mine-return flow, mission debrief displays the returned mission instead of 'no returned mission found'
- [x] #2 Returned mission lookup is resilient to scene transitions/reloads
- [x] #3 Regression is covered by an automated test or deterministic reproduction check
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify existing return-flow patch persists returned mission payload before scene change (`AsteroidPreview._on_return_pressed`).
2. Validate debrief lookup path uses persisted payload (`RocketsManager.get_returned_mission`) and is reload-resilient because it writes to state.
3. Perform deterministic reproduction check (launch -> mine -> return -> debrief expected) and capture validation notes; add follow-up test task if runtime automation remains blocked by engine crash.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Closed and moved to done per user request (2026-02-27).
<!-- SECTION:NOTES:END -->

