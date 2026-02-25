---
id: hcaynf
title: Gate scanner to Mission 3 + rewrite tutorial progression
status: done
priority: high
labels:
  - tutorial
  - missions
  - scanner
  - progression
  - ui
createdAt: '2026-02-17T07:03:26.169Z'
updatedAt: '2026-02-17T07:14:12.960Z'
timeSpent: 0
assignee: '@me'
---
# Gate scanner to Mission 3 + rewrite tutorial progression

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement mission-gated scanner/tutorial flow from notes in .knowns/assets/IMG_1755.jpeg (and related sequence context in .knowns/assets/IMG_1754.jpeg and .knowns/assets/IMG_1756.jpeg). Scanning is not introduced until Mission 3; Missions 1-2 must use predefined targets. Scanner/Station should be hidden until Mission 3 unlock, then shown with new unlock dialogue and player-build step costing 2B F.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Missions 1 and 2 use predefined targets only, with no scanning interaction required or shown
- [ ] #2 Scanner/Scanning Station UI and interaction are hidden/disabled until Mission 3
- [ ] #3 At Mission 3 unlock, show new tutorial dialogue introducing scanner unlock and requiring construction
- [ ] #4 Scanner station construction costs exactly 2,000,000,000 F and blocks scanner usage until paid/built
- [ ] #5 Tutorial copy is rewritten to match this mission order and scanner introduction flow
- [ ] #6 Automated tests cover mission gating (M1/M2), Mission 3 unlock visibility, build-cost enforcement, and updated tutorial progression text triggers
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Gate scanner visibility/interactions by mission progression (unlock at Mission 3)
2. Add scanner build requirement state and 2B F purchase enforcement
3. Force Missions 1-2 to use predefined targets in launch selector
4. Rewrite tutorial sequence/copy so scanner appears after Mission 3 unlock/build
5. Add/adjust automated tests for scanner gating, build cost, and tutorial text flow
6. Run test suite and finalize task notes/status
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented scanner/tutorial progression from .knowns/assets/IMG_1755.jpeg (+ sequence context in IMG_1754/1756).

- Scanner Station is hidden until mission stage 3.
- Added scanner build gating: 2,000,000,000 F required before scanner usage.
- Added unlock/build dialogues and build tutorial action event.
- Missions 1-2 now use predefined progression targets (no scanning dependency).
- Rewrote tutorial sequence/copy so scanning appears only after mission debrief + scanner build.
- Added tests for scanner unlock gating, 2B affordability enforcement, tutorial order, and predefined mission targets.

Validation:
- run_experience_tests.gd: 32/32 pass
- run_tutorial_tests.gd: 2/2 pass
<!-- SECTION:NOTES:END -->

