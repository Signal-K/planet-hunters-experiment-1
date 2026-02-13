---
id: 859hdm
title: Add scene for rocket returning to Earth
status: done
priority: medium
labels:
  - Rockets
  - Return
  - Scenes
createdAt: '2026-02-02T03:30:10.258Z'
updatedAt: '2026-02-02T04:54:36.850Z'
timeSpent: 155
assignee: '@me'
parent: 6v0ybv
---
# Add scene for rocket returning to Earth

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the user directs the rocket to return home, the rocket should fire its thrusters (animated flames come back), and gradually breaks out of the orbit. Then the opposite of the rocket transition towards the target happens, before it gets into an orbit around Earth
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a return-to-Earth transition scene that reintroduces thruster flames, eases out of target orbit, and reverses the sky→space transition.
2. Update the return-home flow to route through this new scene before landing back on Earth.
3. Smoke-test return-home button for the new transition.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added rocket return transition scene with orbit breakout, flame animation, and space→sky gradient
- Wired return-home flow to route through the return transition before Earth scene
<!-- SECTION:NOTES:END -->

