---
id: uh20rm
title: Periodic table mineral dictionary — full taxonomy
status: done
priority: medium
labels:
  - project-landnam
  - game-design
  - economy
  - minerals
  - deferred
createdAt: '2026-03-17T03:17:05.039Z'
updatedAt: '2026-03-19T01:58:03.391Z'
timeSpent: 39798
assignee: '@me'
---
# Periodic table mineral dictionary — full taxonomy

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build a complete mineral taxonomy for the game, similar to a periodic table. All minerals, their properties, rarity tiers, and roles in the economy. Scope: 3 sprints from 2026-03-17 (~2026-04-07).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Full mineral taxonomy document created with all mineral types, tiers, and economic roles
- [x] #2 Contractor system updated to reference mineral types from taxonomy
- [x] #3 Mining minigame system updated to reference mineral tiers
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
MineralCatalog.gd created: 12 minerals across 4 tiers (Common/Uncommon/Rare/Ultra-rare). Single source of truth for colors, prices, spawn weights, unlock levels, contractor demand, economic roles.
MineralPricing.BASE_PRICES expanded with all 12 minerals.
MiningTerrainGenerator._get_mineral_color() now delegates to MineralCatalog; fallback pool built from catalog tier 1-2.
SubcontractorManager.get_bonus_details() added — enriches contractor bonus dict with tier/rarity from catalog.
Taxonomy doc created: @doc/game-design/mineral-taxonomy-full-periodic-table
<!-- SECTION:NOTES:END -->

