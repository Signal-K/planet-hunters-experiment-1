---
id: om1clf
title: Fix sell-in-orbit flow + logbook + balance update
status: in-progress
priority: high
labels:
  - bug
  - ui
  - missions
createdAt: '2026-02-06T01:47:16.788Z'
updatedAt: '2026-02-06T06:29:26.973Z'
timeSpent: 16879
assignee: '@me'
---
# Fix sell-in-orbit flow + logbook + balance update

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sell in orbit button closes dialog without logging/salvage; ensure proper sale flow, mission log updates, and balance updates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sell in orbit completes sale, updates mission log and rocket status
- [ ] #2 Balance updates for sale and scrap only when selected
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect MissionDebrief button handlers for sell/scrap flow (done)
2. Remove auto-close/auto-scrap on sell-in-orbit, ensure sale only (done)
3. Verify scrap/salvage actions update log and status (pending validation)
<!-- SECTION:PLAN:END -->

