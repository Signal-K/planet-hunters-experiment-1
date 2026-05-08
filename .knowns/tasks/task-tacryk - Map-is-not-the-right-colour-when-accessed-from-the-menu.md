---
id: tacryk
title: Map is not the right colour when accessed from the menu
status: done
priority: high
labels:
  - map
  - galaxy
  - ui
  - navigation
createdAt: '2026-05-05T07:50:25.396Z'
updatedAt: '2026-05-08T10:30:45.746Z'
timeSpent: 6
---
# Map is not the right colour when accessed from the menu

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The map is white and has no asteroids or ability to navigate to other solar systems (to see planet candidates). Need a map view of all solar systems. Clicking a target should open a dialogue to create a mission to it and show relevant contractor missions (locked until free missions are unlocked). Also: remove the 'navigate to continue your mission' dialogue.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Map now uses dark space background via BGLayer CanvasLayer + @tool StarField/OrbitLine/PlanetIcon nodes. SpaceMap redesigned with proper dark palette. 'navigate' dialogue does not exist in codebase.
<!-- SECTION:NOTES:END -->

