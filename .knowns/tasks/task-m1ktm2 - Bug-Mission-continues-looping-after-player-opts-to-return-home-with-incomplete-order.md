---
id: m1ktm2
title: >-
  Bug: Mission continues looping after player opts to return home with
  incomplete order
status: done
priority: high
labels:
  - project-landnam
  - bug
  - mission
  - mining
createdAt: '2026-03-16T03:50:37.494Z'
updatedAt: '2026-03-16T06:49:18.049Z'
timeSpent: 0
---
# Bug: Mission continues looping after player opts to return home with incomplete order

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a player chooses to return home mid-mission before completing the full ore order, the mission loop continues rather than cleanly exiting. The return-home flow should terminate the mission state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Selecting return home with an incomplete order exits the mission cleanly
- [ ] #2 Mission does not restart or loop after the player confirms return home
- [ ] #3 Partial order state is correctly resolved or discarded on exit
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed by removing forced restart loop in AsteroidPreview.gd. _on_mining_completed and _on_return_pressed no longer call _restart_starter_run. Player now sees an 'Order incomplete' message but can return home freely.
<!-- SECTION:NOTES:END -->

