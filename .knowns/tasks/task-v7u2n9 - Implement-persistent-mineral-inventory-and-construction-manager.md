---
id: v7u2n9
title: Implement persistent mineral inventory and construction manager
status: done
priority: high
labels:
  - gameplay
  - inventory
  - construction
createdAt: '2026-03-12T00:00:00.000Z'
updatedAt: '2026-03-16T17:46:51.420Z'
timeSpent: 148
assignee: '@me'
---
# Implement persistent mineral inventory and construction manager

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Based on the vision from the 20 Questions, the game needs a way to store collected minerals (Iron, Nickel, etc.) across runs and use them for construction projects (settlements, outposts, refineries).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Selling minerals in debrief removes them from persistent inventory
- [x] #2 Game menu shows current mineral inventory with per-mineral quantities
- [x] #3 Game menu shows construction projects with progress bars
- [x] #4 Player can contribute minerals from inventory toward a construction project
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix MissionDebrief._sell() to consume_from_inventory(_cargo)
2. Add INVENTORY section to GameNavigationMenu
3. Add CONSTRUCTION section to GameNavigationMenu with contribute flow
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed: _sell() in MissionDebrief now calls consume_from_inventory(_cargo) so selling removes minerals from persistent store.
Added INVENTORY section to GameNavigationMenu: lists all minerals + quantities, or empty state message.
Added CONSTRUCTION section: per-project cards with requirement progress bars + Contribute button opening a modal with per-mineral SpinBox allocators.
ConstructionManager + RocketsManager inventory already existed — only wiring and UI were missing.
All 13 regression tests pass.
<!-- SECTION:NOTES:END -->

