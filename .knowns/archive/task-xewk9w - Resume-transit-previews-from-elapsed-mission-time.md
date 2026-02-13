---
id: xewk9w
title: Resume transit previews from elapsed mission time
status: done
priority: high
labels:
  - godot
  - bug
  - state
  - preview
  - transit
createdAt: '2026-02-08T01:39:18.302Z'
updatedAt: '2026-02-08T02:10:03.904Z'
timeSpent: 378
assignee: '@me'
---
# Resume transit previews from elapsed mission time

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Preview transit/return scenes should start from the correct point based on persisted state-change timestamps in rockets_state.json.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Outbound preview starts from elapsed launch progress instead of always starting at Earth orbit
- [x] #2 Return preview starts from elapsed return-home progress instead of always starting at target orbit
- [x] #3 Rockets state persists timestamp metadata for rocket status changes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add persisted status-change timestamps in RocketsManager for launch/return/destroy/returned transitions
2. Compute elapsed outbound progress from mission launch_time/arrival_time and initialize RocketTransit phase/time accordingly
3. Compute elapsed return progress from returning_started and initialize RocketReturn phase/time accordingly
4. Validate with headless test scripts and update task notes
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ RocketTransit preview now resumes from elapsed outbound mission progress using mission launch_time/arrival_time

Validation note: no further Godot runs per user request; verification done via code-path review and diff inspection.

✓ Updated run_experience_tests.gd to cover outbound progress, return progress, and status_changed_at persistence

✓ Review pass: outbound/return elapsed-progress logic validated in RocketTransit/RocketReturn + run_experience_tests.gd (10/10 pass).
<!-- SECTION:NOTES:END -->

