---
id: uzggp6
title: 'Marketplace panel: show market prices at Level 5'
status: done
priority: medium
labels:
  - economy
  - gameplay
  - ui
createdAt: '2026-03-16T17:51:49.024Z'
updatedAt: '2026-03-16T21:38:36.665Z'
timeSpent: 554
assignee: '@me'
---
# Marketplace panel: show market prices at Level 5

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Economy doc specifies Marketplace unlocks at Level 5. Shows live mineral market prices. Prices fluctuate based on supply (player selling drives price down). Allows players to time sales strategically.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Marketplace section added to game menu (or Earth base screen)
- [x] #2 Marketplace is hidden/locked before Level 5 with 'Unlocks at L5' indicator
- [x] #3 Prices shown for each mineral type
- [x] #4 Selling minerals causes price to dip (simple supply effect per mineral)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Marketplace card added to GameNavigationMenu. Locked with 'Unlocks at L5' when level<5. Shows live per-mineral prices with % change vs base. MineralPricing.record_player_sale() called on each sell in MissionDebrief to dip prices. All MECH09-12 pass.
<!-- SECTION:NOTES:END -->

