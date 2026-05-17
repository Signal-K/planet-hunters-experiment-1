---
id: tkj44s
title: System scanner introduction and incremental reveal behavior
status: done
priority: high
labels:
  - project-landnam
  - missions
  - scanner
  - progression
createdAt: '2026-02-17T04:57:18.007Z'
updatedAt: '2026-02-25T08:45:01.999Z'
timeSpent: 175
assignee: '@me'
parent: 4r0j05
---
# System scanner introduction and incremental reveal behavior

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement scanner onboarding behavior from .knowns/assets/IMG_1755.jpeg and .knowns/assets/IMG_1756.jpeg, grounded by progression sketch in .knowns/assets/IMG_1754.jpeg. Use real targets even before scan completion, while scan state controls what information is revealed and when.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission 3 introduces scanner with explicit behavior change
- [x] #2 Target source remains real targets regardless of scan completion
- [x] #3 Scanning incrementally reveals object information across scan actions
- [x] #4 Scanner UI/state does not regress M1/M2 no-scanner expectations
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented scanner and target-source behavior from .knowns/assets/IMG_1754.jpeg, .knowns/assets/IMG_1755.jpeg, .knowns/assets/IMG_1756.jpeg.
- Launchpad now auto-loads real targets when none are present (without requiring prior scanner interaction).
- Launchpad anomaly fetch now persists real detected targets to RocketsManager for mission selection.
- Added scan-count persistence in RocketsManager (`scan_counts`) and scan-pass recording on completed scans.
- Satellite station list now reveals target details incrementally by scan count (tiered metadata visibility).
- Existing M1/M2 expectations preserved: target source remains real targets regardless scan completion.
- Validation: run_tutorial_tests.gd (2/2 pass), run_experience_tests.gd (19/19 pass).



Spec Reference: @doc/specs/mission-system-specification (Scanner introduction M3)
<!-- SECTION:NOTES:END -->

