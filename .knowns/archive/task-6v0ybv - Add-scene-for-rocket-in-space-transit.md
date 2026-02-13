---
id: 6v0ybv
title: Add scene for rocket in space transit
status: done
priority: medium
labels:
  - Scene
  - Transition
  - Rockets
createdAt: '2026-02-02T03:27:34.521Z'
updatedAt: '2026-02-02T04:50:01.523Z'
timeSpent: 232
assignee: '@me'
---
# Add scene for rocket in space transit

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Basically the rocket should be flying over a background that goes from sky colour to a deep space black colour, before the rocket is dragged into orbit around the target
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a rocket-transit scene + script that animates a sky→space background and the rocket sprite, then auto-advances to the asteroid preview.
2. Wire NewMissionLaunchList preview flow to route through the transit scene (keeping existing preview target data).
3. Smoke-test launch → preview flow for expected transitions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added rocket transit scene with sky→space gradient and rocket tween, auto-advance to preview
- Routed mission preview flow through transit scene
<!-- SECTION:NOTES:END -->

