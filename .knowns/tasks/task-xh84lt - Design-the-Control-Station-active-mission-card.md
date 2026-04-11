---
id: xh84lt
title: Design the Control Station active mission card
status: done
priority: high
labels: []
createdAt: '2026-04-01T11:55:13.205Z'
updatedAt: '2026-04-13T03:07:39.248Z'
timeSpent: 0
assignee: '@Liam'
parent: q1jyo4
---
# Design the Control Station active mission card

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Control Station Active Tab (ControlStationPanel.tscn) lists in-flight missions. Cards currently show rocket ID, target label, resume button. Missing: contractor name, their mineral order, return status. Design the compact card layout for two states: in-orbit and returning. Must match width of Satellite Station list cards. Data available: rockets.status, missions.requested_minerals, contractors.name + role, affinity_scores.affinity_points. Output: layout spec or sketch covering data hierarchy and both states. Kanban: zpo0t2
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Control Station redesign from attached reference: telemetry strip, active/story views, stronger mission state cards, queue/log sidebar, and optional non-onboarding positioning. Verified in ControlStationPanel.gd and focused loan/control flows.
<!-- SECTION:NOTES:END -->

