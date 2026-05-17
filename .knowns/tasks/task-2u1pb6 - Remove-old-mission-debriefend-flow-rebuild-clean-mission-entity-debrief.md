---
id: 2u1pb6
title: Remove old mission debrief/end flow; rebuild clean mission entity + debrief
status: done
priority: medium
labels:
  - project-landnam
  - godot
  - ui
  - missions
  - architecture
createdAt: '2026-03-27T01:05:44.909Z'
updatedAt: '2026-03-27T04:17:16.972Z'
timeSpent: 11483
assignee: '@me'
---
# Remove old mission debrief/end flow; rebuild clean mission entity + debrief

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current debrief/selling/orbit UI is bloated and messy. Remove all end-mission, debrief, selling, orbit-sale components and replace with: (1) proper mission entity with goingTo and location[] fields, (2) minimal clean debrief screen showing goal status + sell action + complete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 mission_debrief.tscn + MissionDebrief.gd deleted
- [x] #2 orbit_sale_preview.tscn + OrbitSalePreview.gd deleted
- [x] #3 Orbiting-rocket functions removed from RocketsManager
- [x] #4 add_mission() emits goingTo and location array fields
- [x] #5 update_mission_going_to() and append_mission_location() helpers added to RocketsManager
- [x] #6 New MissionDebriefV2 scene/script created: shows goal status, cargo, sell action, complete button
- [x] #7 All RETURN_DESTINATION refs updated to mission_debrief_v2.tscn
- [x] #8 TutorialCatalog DEBRIEF_SCENES updated to mission_debrief_v2
- [x] #9 orbit_sale_preview removed from MissionProgressTracker HIDE_SCENES
<!-- AC:END -->

