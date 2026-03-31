---
id: vmhqds
title: Design the debrief payout breakdown panel
status: todo
priority: medium
labels: []
createdAt: '2026-04-01T11:55:18.449Z'
updatedAt: '2026-04-01T11:55:18.449Z'
timeSpent: 0
assignee: '@Liam'
---
# Design the debrief payout breakdown panel

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The mission debrief (mission_debrief_v2.tscn, Reward phase) calculates a 4-tier payout: base mineral value, order bonus (×0.20 × order_ratio), affinity bonus (affinity_points × 0.5%, cap 25%), discovery bonus (10% + 1% per annotation depth). Design the visual hierarchy of the breakdown and 3 order states: order filled (all 4 tiers), order missed (order bonus shows as 0, not hidden), free ops (no contractor row). Output: layout spec covering total + tier breakdown + 3 state variants. Kanban: 01905l
<!-- SECTION:DESCRIPTION:END -->

