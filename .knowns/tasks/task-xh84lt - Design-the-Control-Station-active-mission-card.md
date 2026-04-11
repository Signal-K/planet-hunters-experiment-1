---
id: xh84lt
title: Design the Control Station active mission card
status: todo
priority: high
labels: []
createdAt: '2026-04-01T11:55:13.205Z'
updatedAt: '2026-04-11T03:59:49.807Z'
timeSpent: 0
assignee: '@Liam'
---
# Design the Control Station active mission card

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Control Station Active Tab (ControlStationPanel.tscn) lists in-flight missions. Cards currently show rocket ID, target label, resume button. Missing: contractor name, their mineral order, return status. Design the compact card layout for two states: in-orbit and returning. Must match width of Satellite Station list cards. Data available: rockets.status, missions.requested_minerals, contractors.name + role, affinity_scores.affinity_points. Output: layout spec or sketch covering data hierarchy and both states. Kanban: zpo0t2
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## ControlStationPanel redesign complete (branch: claude/redesign-control-panel-siBXM)
Panel fully redesigned (scene-first):
- Light-themed main area with dark green sidebar (5 nav icon buttons)
- Header: MOD-04 / CONTROL PANEL / TEMP / UPTIME / × close
- MissionsList is now HBoxContainer (horizontal cards side-by-side)
- Mission cards: rocket name, IN-ORBIT (cyan badge) / RETURNING (green badge), Target row, mineral chips
- Globe placeholder panel (dark) + FLEET OPERATIONAL status bar
Screenshot: user://ux_screenshots/panel_redesign/04_04_control_station.png

Note: empty-state shown in screenshot (no active missions in test state).
Card design spec from this task is now implemented — see _create_mission_card() in ControlStationPanel.gd.
<!-- SECTION:NOTES:END -->

