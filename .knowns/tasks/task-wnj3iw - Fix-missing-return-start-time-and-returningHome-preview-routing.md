---
id: wnj3iw
title: Fix missing return start time and returningHome preview routing
status: in-progress
priority: high
labels:
  - bug
  - rocket-state
createdAt: '2026-02-06T01:39:32.589Z'
updatedAt: '2026-02-06T01:47:55.447Z'
timeSpent: 475
assignee: '@me'
---
# Fix missing return start time and returningHome preview routing

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Return-home state lacks timestamp; preview starts at target scene. Add migration and persistence for return start time and ensure returning/returned preview routing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 returningHome rockets persist return start time
- [ ] #2 returning rockets preview starts in return transit or Earth orbit based on elapsed time
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect RocketsManager return-home persistence + preview routing
2. Backfill missing return start times and auto-promote overdue returns
3. Ensure return_home always stamps returning_started and persist
<!-- SECTION:PLAN:END -->

