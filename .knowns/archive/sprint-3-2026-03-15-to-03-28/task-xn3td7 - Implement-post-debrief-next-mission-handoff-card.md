---
id: xn3td7
title: Implement post-debrief next mission handoff card
status: done
priority: high
labels:
  - debrief
  - ux
  - progression
  - ui
createdAt: '2026-03-27T04:16:30.837Z'
updatedAt: '2026-03-27T12:09:05.309Z'
timeSpent: 0
assignee: '@me'
---
# Implement post-debrief next mission handoff card

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the flow defined by @task-ommhwg inside the debrief scene instead of relying only on the already-shipped base-screen CTA from @task-i5w6mi. After reward/feedback, the player should see a mission-briefing style handoff card that shows what mission/location/contractor is next and lets them move directly into the next loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Post-debrief flow shows an in-game next-mission handoff card after rewards are resolved
- [x] #2 Card surfaces at least location, contractor, and mission objective / next action
- [x] #3 Primary CTA routes the player back into the next mission loop
- [x] #4 Debrief flow includes an explicit scrap/salvage ship action without breaking current progression
- [x] #5 Implementation leaves room for future reusable/repairable ships instead of assuming permanent scrapping forever
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the existing reward/debrief calculation flow in `scene/Scripts/Earth/MissionDebriefV2.gd`, but split the UI into reward resolution first and mission handoff second.
2. Add a post-reward handoff card matching @task-ommhwg with Location, Contractor, Mission, and a primary next-mission CTA that routes back into the loop.
3. Add an explicit scrap/salvage ship action in the debrief flow using current salvage data, but structure it so reusable/repairable ships can replace the behavior later.
4. Add focused validation/tests for the new debrief handoff state and confirm existing mission progression still passes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
Implemented the ommhwg notebook decisions in `scene/Scripts/Earth/MissionDebriefV2.gd` as a two-phase post-mission flow.
Phase 1 remains reward resolution (sell cargo / payout). Phase 2 is an in-game handoff card that surfaces next mission location, contractor, and mission objective, then routes straight to the launchpad.
Added an explicit `Scrap / Salvage Ship` action in the handoff phase using current destroy/archive state plus salvage refund math, but kept it separate from the handoff card so future reusable/repairable ship logic can replace it cleanly.
Added focused coverage in `scene/tests/run_mission_debrief_v2_tests.gd`.
Validated with:
- `godot --headless --path scene --script res://tests/run_mission_debrief_v2_tests.gd`
- `godot --headless --path scene --script res://tests/run_mission_e2e_flow_tests.gd`
<!-- SECTION:NOTES:END -->

