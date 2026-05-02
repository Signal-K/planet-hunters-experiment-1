---
id: 49fr2b
title: Write button guide copy for mining and debrief screens
status: done
priority: medium
labels:
  - liam-sprint
  - writing
  - design
createdAt: '2026-03-24T00:17:01.017Z'
updatedAt: '2026-03-27T12:09:05.367Z'
timeSpent: 404
assignee: '@me'
---
# Write button guide copy for mining and debrief screens

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players don't know what the buttons do. Write plain-language labels and a one-sentence description for each key button on the mining screen (sell, scrap, keep, drone, return to base) and the mission debrief screen. Short, clear, no jargon. These will render inside a small help overlay.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Translate the notebook sketch into final mining + debrief button-guide copy.
2. Update the existing mining ? Guide overlay with the new plain-language labels and descriptions.
3. Add the same compact guide overlay pattern to MissionDebriefV2 for its live actions.
4. Add focused tests for the overlay copy and button availability.
5. Write the sketch analysis and implementation summary back into Knowns, then close the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Notebook sketch translated into compact in-scene button guides.

Implemented
- Mining guide copy rewritten in plain language for Mine, Drone, Inventory, Return to Base
- MissionDebriefV2 now has a matching ? Guide overlay for reward and handoff actions
- Added focused tests for debrief guide copy and mining handbook copy

Sketch notes captured
- Small in-place guide, not a blocking modal
- Mining sketch emphasized Mine/Drone/Return plus mobile-context controls
- Debrief guide aligned to live actions instead of placeholder buttons

Validation
- PASS: run_mission_debrief_v2_tests.gd
- PASS: new mining handbook assertion inside run_structure_tests.gd
- Existing unrelated failure remains in run_structure_tests.gd: stage-3 scanner unlock test
<!-- SECTION:NOTES:END -->

