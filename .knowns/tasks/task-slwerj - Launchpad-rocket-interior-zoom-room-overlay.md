---
id: slwerj
title: Launchpad rocket interior zoom + room overlay
status: done
priority: high
labels:
  - project-landnam
  - launchpad
  - rooms
  - rocket
  - ui
  - zoom
createdAt: '2026-03-05T12:47:03.886Z'
updatedAt: '2026-03-05T12:52:27.843Z'
timeSpent: 255
assignee: '@me'
---
# Launchpad rocket interior zoom + room overlay

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When viewing a rocket on the launchpad, allow zoom-in to interior room view by fading the rocket sprite into a hull outline that reveals room modules. Use room assignments tied to rocket tiers from @task-hj2q5t and @doc/game-design/level-progression-and-unlocks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 User can zoom in/out on launchpad rocket view.
- [x] #2 Rocket sprite fades to an outline/interior mode while zoomed.
- [x] #3 Interior room modules shown reflect the active rocket tier (SR1/SR2/SR3 mapping).
- [x] #4 Feature does not break launch flow, selector panel, or existing launchpad interactions.
- [x] #5 Tests pass for existing progression/launchpad-related suites.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add launchpad interior zoom controller script with room rendering per rocket type.
2. Integrate with launchpad camera and rocket nodes (fade sprite -> hull outline + rooms on zoom).
3. Add user interactions to toggle zoom and restore state safely on scene changes.
4. Map room loadouts by rocket tier using knowns room progression references.
5. Run tests and complete task bookkeeping.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added launchpad rocket interior inspection mode in LaunchpadScene with an `Inspect Rooms` button, `I` hotkey toggle, `Esc` exit, and mouse-wheel zoom while inspecting.
- Implemented camera tween zoom + focus on active launchpad rocket, with fade transition from rocket sprite to hull-outline interior overlay.
- Added interior room rendering from RoomCatalog + RoomSpriteAtlas, including offline-upgrade stripe indicator for rooms marked offline.
- Added canonical room mapping helper `RoomCatalog.create_layout_for_rocket_type()` (SR1/SR2/SR3) using knowns progression definitions and reused it in SidescrollMining to keep mappings consistent.
- Preserved launch flow and existing launchpad interactions; inspect UI only appears when a rocket is present.

- Added direct click-to-inspect: left-clicking the rocket sprite now enters room inspection zoom mode.
<!-- SECTION:NOTES:END -->

