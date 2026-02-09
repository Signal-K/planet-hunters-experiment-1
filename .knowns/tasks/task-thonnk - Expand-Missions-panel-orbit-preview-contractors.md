---
id: thonnk
title: Expand Missions panel + orbit preview contractors
status: done
priority: medium
labels:
  - Missions
  - UI
  - Orbit
  - Contracts
  - Inventory
  - Godot
createdAt: '2026-02-02T11:05:06.813Z'
updatedAt: '2026-02-08T02:54:06.168Z'
timeSpent: 0
---
# Expand Missions panel + orbit preview contractors

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename New Mission button to Missions and show rockets by status (orbit, transit, awaiting launch, awaiting decommission). Add orbit preview scene with contractors offering mineral rates gated by XP; allow sell + salvage/scrap/archive; salvage adds materials to on-earth inventory. Related: @.knowns/tasks/task-izno4u @.knowns/tasks/task-mzl2k8 @.knowns/tasks/task-jwbgbj @.knowns/tasks/task-i3mm2s
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Missions button shows grouped rocket list for orbit/transit/awaiting launch/awaiting decommission
- [x] #2 Orbit preview scene shows rocket + Earth + contractor offers gated by XP
- [x] #3 Sell + salvage/scrap/archive flows work; salvage records to on-earth inventory
- [x] #4 Tests cover contractor gating and salvage recording
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add targeted tests for subcontractor level gating behavior.
2. Add targeted tests proving salvage-related mission recording persists required fields.
3. Run mission log and experience/sync suites and capture evidence.
4. Update AC/status based on results.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
⚠️ Reopened: AC #4 expects contractor gating + salvage-recording test coverage; current suites do not include targeted assertions for this flow.

✓ Added explicit tests for subcontractor gating by level and salvage action mission-log recording in run_mission_log_tests.gd.

Validation: contractor gating + salvage recording coverage now included and passing.
<!-- SECTION:NOTES:END -->

