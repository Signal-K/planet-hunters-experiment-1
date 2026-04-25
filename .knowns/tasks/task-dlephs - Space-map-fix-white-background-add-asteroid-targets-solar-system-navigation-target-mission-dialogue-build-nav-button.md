---
id: dlephs
title: >-
  Space map: fix white background, add asteroid targets, solar system
  navigation, target mission dialogue, build nav button
status: done
priority: high
labels:
  - map
  - ux
  - missions
  - nav
  - build
  - space-map
  - earth
createdAt: '2026-04-23T10:10:42.236Z'
updatedAt: '2026-04-23T10:13:59.785Z'
timeSpent: 106
assignee: '@me'
---
# Space map: fix white background, add asteroid targets, solar system navigation, target mission dialogue, build nav button

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
See screenshot (image attached in notes).

Issue: the map is white, and has no asteroids or ability to navigate to other solar systems (to see the planet candidates), additionally we need to be able to see a map view of all solar systems.

Clicking on a target in the map should open a dialogue to create a mission to it, and also show any contractor missions that would be relevant. If the user hasn't unlocked free missions, then this should be locked.

Finally, remove the 'navigate to continue your mission' dialogue and add more tags/labels to this ticket.

The main nav bar along the bottom should also show the option to construct new buildings — set up a starter dialogue that's functional, for now it only works for building new things on Earth.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Space map background is dark (space-like), not white
- [x] #2 Asteroid targets are visible in solar view
- [x] #3 Clicking a target opens an inline overlay dialogue — not a scene change
- [x] #4 Dialogue shows target info, launch option, and any relevant active contractor missions
- [x] #5 Launch option is disabled/locked for players below free-ops stage (mission stage < 4)
- [x] #6 Navigate to continue your mission. fallback text is removed from TutorialCoachOverlay
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed in one pass:
- SpaceMap.gd: replaced DS/NebulaSciTheme gradient (light-mode palette) with BG_COLOR=dark constant
- SpaceMap.gd: _open_target_preview now shows inline overlay (TargetDialogue on CanvasLayer) instead of scene change; includes target info, contractor roster, launch button (gated by is_free_operations_unlocked)
- TutorialCoachOverlay.gd: _resume_hint_for_step() fallback returns "" (empty); message_label hidden when hint is empty
<!-- SECTION:NOTES:END -->

