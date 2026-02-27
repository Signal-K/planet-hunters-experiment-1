---
id: vhjpr9
title: Explain each structure to the user
status: done
priority: medium
labels:
  - Tutorial
  - Structures
createdAt: '2026-01-20T01:58:33.899Z'
updatedAt: '2026-02-25T08:45:18.729Z'
timeSpent: 0
assignee: '@me'
parent: 5zp87f
---
# Explain each structure to the user

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Telescope Station: Discover objects and targets for future missions here

Control Station: Control all missions and rockets

Launchpad: Launch missions here

Can probably get AI to augment this :)
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Redesign tutorial system: convert TutorialPanel into a structured step-by-step guide with persistent progress, contextual instructions, and structure explanations.
2. Wire gameplay signals into tutorial progress for scan, rocket creation, target selection, launch, mining, return/debrief, and post-mission economy actions (sell/salvage/scrap/store).
3. Integrate level/unlock explanations into tutorial content by reading unlock data from existing progression systems (rockets, missions, subcontractors, planet scan unlock).
4. Update in-game copy/UI so each structure (Satellite Station, Launchpad, Control Station, Market/Subcontractors, Menu/Progress) is clearly explained in context.
5. Validate flow manually via scene transitions and run available tests/lint for touched scripts; then update task notes and AC.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Rebuilt tutorial panel into 7-step guided mission flow (scan→rocket→target→launch→mine→return→debrief). ✓ Added dynamic structure explanations + level unlock overview in-panel. ✓ Added AppController tutorial progress signal/API + auto-complete on final step. ✓ Hooked debrief actions (sell/salvage/scrap/keep/leave/archive) to final tutorial step.

✓ Replaced oversized tutorial wall with compact coach card (single action line + short context). ✓ Added scene-aware guidance text per step (EarthBase1, LaunchpadScene, AsteroidPreview, MissionDebrief). ✓ Removed checklist/structures/unlocks dump from live overlay.

✓ Added visual guidance: tutorial now pulses the current target UI/structure and shows a pointer marker to direct attention step-by-step.

✓ Fixed disappearance by instancing TutorialPanel in Launchpad scene. ✓ Also instanced TutorialPanel in AsteroidPreview and MissionDebrief for uninterrupted guidance. ✓ Reduced on-card text to a single instruction line and added responsive card width/font sizing for smaller screens.

✓ Added TutorialPanel instance to transition preview scenes: rocket_transit and rocket_return (fixes missing tutorial in en-route/mining preview flow).



Spec Reference: @doc/specs/mission-system-specification (Tutorial system)
<!-- SECTION:NOTES:END -->

