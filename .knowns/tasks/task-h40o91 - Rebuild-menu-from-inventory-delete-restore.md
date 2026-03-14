---
id: h40o91
title: Rebuild menu from inventory (delete + restore)
status: in-progress
priority: high
labels:
  - menu
  - ui
  - rebuild
createdAt: '2026-03-14T06:00:33.975Z'
updatedAt: '2026-03-14T06:05:49.384Z'
timeSpent: 0
assignee: '@me'
---
# Rebuild menu from inventory (delete + restore)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document every menu element/behavior, then rebuild menu panel implementation from scratch and restore all menu functions in a clean path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Full menu inventory captured (tabs, controls, actions)
- [ ] #2 Menu implementation rebuilt from clean baseline
- [ ] #3 All original menu functions restored and operational
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace old menu open path with a new AppController-owned runtime menu implementation (no dependency on MenuPanel scene/script).
2. Route Earth nav Menu action through UIManager -> AppController runtime menu only.
3. Keep tutorial/reset/practice/dialogue controls in rebuilt menu and ensure close/hide lifecycle is stable.
4. Remove old menu preload dependency from AppController to avoid loading legacy menu artifacts.
<!-- SECTION:PLAN:END -->

