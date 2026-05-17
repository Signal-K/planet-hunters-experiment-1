---
id: x1arqd
title: Universal first-time mechanic tutorial system
status: done
priority: medium
labels:
  - project-landnam
  - ux
  - tutorial
  - onboarding
createdAt: '2026-03-17T06:48:24.346Z'
updatedAt: '2026-03-19T02:06:38.036Z'
timeSpent: 462
assignee: '@me'
---
# Universal first-time mechanic tutorial system

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a mission type introduces a new mechanic (refining, construction, etc.), a tutorial overlay triggers exactly once on first attempt. Universal post-M4 onboarding pattern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 System detects when player accepts a mission type for the first time
- [x] #2 Inline tutorial overlay triggered on first attempt of that mission type
- [x] #3 Tutorial covers: what the mechanic is, how to do it, what to expect
- [x] #4 Tutorial never shown twice for the same mechanic
- [x] #5 Applies to: construction, refining, off-world refinery, room upgrades, and any future new mechanic
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
MechanicIntroCatalog.gd: content for room_upgrades, scanner_station, construction, refining, off_world_refinery, free_operations, marketplace.
FirstTimeMechanicTracker.gd: persists to mechanic_intros_seen.json; maybe_show(key, tree) shows overlay exactly once.
MechanicIntroOverlay.gd: self-building CanvasLayer overlay with icon+title, 3 sections (what/how/expect), dismiss button.
AppControllerHelper.maybe_show_mechanic_intro(key): one-line hook for any future scene.
Wired: room_upgrades in GameNavigationMenu._do_room_upgrade(); scanner_station in SatelliteStationPanel._ready().
<!-- SECTION:NOTES:END -->

