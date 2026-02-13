---
id: om1clf
title: Fix sell-in-orbit flow + logbook + balance update
status: done
priority: high
labels:
  - bug
  - ui
  - missions
createdAt: '2026-02-06T01:47:16.788Z'
updatedAt: '2026-02-09T01:33:22.761Z'
timeSpent: 16893
assignee: '@me'
---
# Fix sell-in-orbit flow + logbook + balance update

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sell in orbit button closes dialog without logging/salvage; ensure proper sale flow, mission log updates, and balance updates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sell in orbit completes sale, updates mission log and rocket status
- [x] #2 Balance updates for sale and scrap only when selected
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit MissionDebrief sell/scrap action guards and side effects
2. Enforce single-action closeout flow (sell OR scrap), correct payout/log writes
3. Add mission-flow tests covering orbit sale log/balance and scrap gating
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ MissionDebrief now enforces single closeout action (sell/scrap/leave/archive lock). Added mission debrief regression tests in run_mission_log_tests.gd (8/8 pass).
<!-- SECTION:NOTES:END -->

