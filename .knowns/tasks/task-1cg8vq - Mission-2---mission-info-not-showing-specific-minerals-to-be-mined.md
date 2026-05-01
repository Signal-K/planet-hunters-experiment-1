---
id: 1cg8vq
title: Mission 2 - mission info not showing specific minerals to be mined
status: done
priority: high
labels: []
createdAt: '2026-05-03T04:17:58.600Z'
updatedAt: '2026-05-05T09:28:00.000Z'
timeSpent: 0
---
# Mission 2 - mission info not showing specific minerals to be mined

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
It just showed a message saying that minerals needed to be mined, but it didn't show the progress
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed Mission 2+ mission requirements to use the selected trip contractor's generated `requested_minerals` instead of falling back to starter-only data. `RocketsManager.get_trip_selected_contractor()` now preserves per-offer order quantities from `trip_contract_offer`, and `GameNavigationMenu` renders the mission requirements card from the current contract source so players see per-mineral progress like `2 / 4 kg` instead of generic copy. Added regression coverage in `run_structure_tests.gd`.
<!-- SECTION:NOTES:END -->
