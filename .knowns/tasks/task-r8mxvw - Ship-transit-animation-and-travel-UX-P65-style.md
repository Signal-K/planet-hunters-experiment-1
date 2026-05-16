---
id: r8mxvw
title: Ship transit animation and travel UX (P65 style)
status: done
priority: medium
labels:
  - project-landnam
  - transit
  - animation
  - UX
  - ship
  - experiment1
createdAt: '2026-02-28T00:00:00.000Z'
updatedAt: '2026-03-06T04:19:25.348Z'
timeSpent: 835
assignee: '@me'
---
# Ship transit animation and travel UX (P65 style)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Notes from physical notebook page 119 (28.02.26). While thinking about P65-style ship building, ideas came up around the in-transit travel experience and how the ship animates during travel.

**Transcribed notes (page 119, 28.02.26):**

> P65 → style Ship Building — this morning and it got me on the subject of travel:
>
> - → shop button during transit
> - → actual transitions / shaking point — a chain ... higher ... (not points)
> - → actual transition shapes
> - → ship data dashboard
> - → rocket begins to rotate
>
> → fully, rocket onto [progress bar], sides → (this part & [sketch])
> → Now, the last transition (arguably [fine] now)

Sketches show 4 frames of rocket/ship orientation representing distinct transition states during travel.

Context note from same page (25.02.26):

> Orbital → (the demo is a rooms mockup — there needs to be stories of rooms)
> Art can be about finding, lose more journeys
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A "shop" or action button is accessible during the transit phase.
- [x] #2 The ship visually transitions between states (e.g. shaking, rotating) during travel.
- [x] #3 Transition shapes/frames are defined and implemented (4+ keyframes sketched).
- [x] #4 A ship data dashboard is displayed during transit showing relevant flight info.
- [x] #5 Rocket rotation animation plays as the ship progresses along the route.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Rocket follows arc from Earth orbit position to viewport center during TRAVEL, with sinusoidal Y offset for visual depth
- Rotation tracks travel direction (atan2 with sprite correction)
- 0.6s decaying shake on travel start
- Ship Status button (top-right, TRAVEL phase only) toggles panel showing vessel name + installed rooms from RoomCatalog
- Travel dashboard enhanced: distance, ETA MM:SS countdown
- All 4 phases visually distinct; 23/23 GDScript tests pass
<!-- SECTION:NOTES:END -->

