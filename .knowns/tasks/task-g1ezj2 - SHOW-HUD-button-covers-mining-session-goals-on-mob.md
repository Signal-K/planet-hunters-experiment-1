---
id: g1ezj2
title: SHOW HUD button covers mining session goals on mobile
status: done
priority: high
labels:
  - mobile,ux,hud,mining
createdAt: '2026-05-03T11:50:55.246Z'
updatedAt: '2026-05-04T16:40:00.000Z'
timeSpent: 0
assignee: '@Liam'
---
# SHOW HUD button covers mining session goals on mobile

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The SHOW HUD trigger button was positioned at top:0 (max safe-area-inset-top) which overlaps the Godot game's mission goals / mineral tracker shown at the top of the canvas. Fix: moved button to bottom of screen (above safe-area inset) with tab-from-bottom border-radius. HUD panel also moved to bottom so the full top of the game canvas stays unobstructed.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-04
- Kept the HUD shell trigger at the bottom.
- Lifted the in-game mining bottom bar via `UILayout.MINING_BOTTOM` + shared `bottom_clearance()` so gameplay controls no longer sit on the same edge as the mobile HUD shell and navigation pill.
<!-- SECTION:NOTES:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SHOW HUD button sits at bottom of screen, not top
- [x] #2 Mining session goals and mineral tracker are fully visible
- [x] #3 HUD panel appears at bottom when revealed
<!-- AC:END -->
