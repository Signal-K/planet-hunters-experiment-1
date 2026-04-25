---
id: 0cf8ow
title: >-
  Repair missing asset references for StarterRocketStage2Frame1 and Earth1
  backdrops
status: done
priority: high
labels:
  - assets
  - stability
  - tests
createdAt: '2026-03-10T05:43:34.201Z'
updatedAt: '2026-03-10T05:53:04.342Z'
timeSpent: 11
assignee: '@me'
---
# Repair missing asset references for StarterRocketStage2Frame1 and Earth1 backdrops

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Headless audit reports missing resource imports for StarterRocketStage2Frame1.png and Earth1.png referenced by scenes/transitions. Fix paths/assets to remove parse/load errors.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SidescrollMining scene loads without missing StarterRocketStage2Frame1 resource error
- [x] #2 mission_debrief and transition scenes resolve Earth1 backdrop resource
- [x] #3 Headless test runs no longer emit these missing-asset parse errors
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Ran headless Godot import to regenerate missing texture imports for StarterRocketStage2Frame1 and Earth1 resources.
- Confirmed SidescrollMining, mission debrief, and transition scripts load those textures without missing-resource parse errors.
- Re-ran mission, narrative, and structure headless suites successfully.
<!-- SECTION:NOTES:END -->

