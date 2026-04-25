---
id: h40o91
title: Rebuild menu from inventory (delete + restore)
status: done
priority: high
labels:
  - menu
  - ui
  - rebuild
createdAt: '2026-03-14T06:00:33.975Z'
updatedAt: '2026-03-16T17:34:16.915Z'
timeSpent: 214391
assignee: '@me'
---
# Rebuild menu from inventory (delete + restore)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document every menu element/behavior, then rebuild menu panel implementation from scratch and restore all menu functions in a clean path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Full menu inventory captured (tabs, controls, actions)
- [x] #2 Menu implementation rebuilt from clean baseline
- [x] #3 All original menu functions restored and operational
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace old menu open path with a new AppController-owned runtime menu implementation (no dependency on MenuPanel scene/script).
2. Route Earth nav Menu action through UIManager -> AppController runtime menu only.
3. Keep tutorial/reset/practice/dialogue controls in rebuilt menu and ensure close/hide lifecycle is stable.
4. Remove old menu preload dependency from AppController to avoid loading legacy menu artifacts.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
GameNavigationMenu.gd is now the single canonical menu path.

Added: progress card (XP bar, next-level XP), unlocks list (rockets/contractors/missions by level), logbook overlay (mission history), debug section (instant mining, grant money, jump M1-M5), scroll wrapper for overflow.

Removed dead code from AppController: _build_safe_menu_panel(), _ensure_menu_layer(), _on_menu_panel_closed(), _on_counter_changed(), current_menu_panel var, _menu_layer var. Cleaned UIManager: removed unused current_menu_panel var and _setup_menu_panel_integration stub.

All 10 GDScript tests pass.
<!-- SECTION:NOTES:END -->

