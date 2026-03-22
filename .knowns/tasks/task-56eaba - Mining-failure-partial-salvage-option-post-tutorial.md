---
id: 56eaba
title: 'Mining failure: partial salvage option (post-tutorial)'
status: done
priority: medium
labels:
  - gameplay
  - mining
  - ux
createdAt: '2026-03-16T17:52:14.877Z'
updatedAt: '2026-03-16T21:23:23.519Z'
timeSpent: 0
assignee: '@me'
---
# Mining failure: partial salvage option (post-tutorial)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mining doc specifies two failure states: tutorial = failure message + restart. Post-tutorial = partial salvage available + restart option with penalty. Currently there is no partial salvage path implemented. Entry point: SidescrollMining.gd failure handling.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Post-tutorial mining failure shows two options: 'Partial salvage' (keep what was mined, no retry) and 'Retry with penalty' (reset progress, small franc penalty)
- [x] #2 Tutorial missions still show simple failure + restart (no salvage option)
- [x] #3 Partial salvage minerals are added to inventory as normal
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AsteroidPreview.gd: when completion_reason=fuel_depleted and not tutorial (not starter contract, mission_stage > 1), shows salvage-or-retry dialog. Salvage: keep minerals, show message. Retry: consume_from_inventory to undo auto-add, apply -50M F penalty, re-enable mine button.
<!-- SECTION:NOTES:END -->

