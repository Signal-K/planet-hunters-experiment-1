---
id: vmhqds
title: Design the debrief payout breakdown panel
status: done
priority: medium
labels:
  - project-landnam
createdAt: '2026-04-01T11:55:18.449Z'
updatedAt: '2026-04-13T13:44:01.341Z'
timeSpent: 488
assignee: '@me'
parent: q1jyo4
---
# Design the debrief payout breakdown panel

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The mission debrief (mission_debrief_v2.tscn, Reward phase) calculates a 4-tier payout: base mineral value, order bonus (×0.20 × order_ratio), affinity bonus (affinity_points × 0.5%, cap 25%), discovery bonus (10% + 1% per annotation depth). Design the visual hierarchy of the breakdown and 3 order states: order filled (all 4 tiers), order missed (order bonus shows as 0, not hidden), free ops (no contractor row). Output: layout spec covering total + tier breakdown + 3 state variants. Kanban: 01905l
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Debrief payout panel work landed in MissionDebriefV2.gd: responsive summary grid, narrower guide footprint, and cleaner narrow-landscape behavior without nav collisions. run_mission_debrief_v2_tests passes 5/5.

2026-04-13: rebuilt debrief layout: header rail + compact guide, payout breakdown card, tighter reward grid, action dock sizing, safer panel height above bottom nav. Verified run_mission_debrief_v2_tests 5/5.
<!-- SECTION:NOTES:END -->

