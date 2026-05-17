---
id: 9fnnsw
title: 'UX: Add ore colour legend to mining minigame'
status: done
priority: high
labels:
  - project-landnam
  - ux
  - mining
  - ui
  - clarity
createdAt: '2026-03-16T03:50:52.514Z'
updatedAt: '2026-03-16T06:49:28.371Z'
timeSpent: 0
---
# UX: Add ore colour legend to mining minigame

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players cannot tell which colour ore on the mining map corresponds to the ore they need to mine. A visible colour key or legend is needed in the mining UI so players know what to aim for.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mining UI shows a colour swatch next to each ore name in the order panel
- [ ] #2 Ore colours in the terrain match the swatches shown in the legend
- [ ] #3 Legend is visible at all times during mining (not hidden behind other UI)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added _MINERAL_COLOR_HINTS dict to SidescrollMining.gd. Contract order tracker now appends color name in parens: 'Iron (orange): 0/50 kg'.
<!-- SECTION:NOTES:END -->

