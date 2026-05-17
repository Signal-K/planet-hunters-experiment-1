---
id: ifkjpb
title: Add in-game guide / button handbook
status: done
priority: medium
labels:
  - project-landnam
  - ux
  - tutorial
  - guide
  - onboarding
createdAt: '2026-03-01T10:21:23.392Z'
updatedAt: '2026-03-07T01:36:31.197Z'
timeSpent: 75
assignee: '@me'
---
# Add in-game guide / button handbook

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tester feedback: 'Maybe name the buttons, or, have a handbook that explains what the buttons do and how to use them? A guide, essentially\!' Players are confused about what buttons do, especially in mining and debrief screens. A contextual help tooltip or a tappable (i) icon per button section would address this without a full docs screen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Player can access a description of what each major action button does
- [x] #2 Guide is accessible without leaving the current screen
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add in-scene guide/help overlay to MissionDebrief major action buttons
2. Add in-scene guide/help overlay to SidescrollMining controls
3. Ensure help can be opened/closed without scene navigation
4. Validate scene loads and close task
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added in-scene '? Guide' overlay to MissionDebrief and SideScrollMining with plain-language descriptions of major action buttons/controls; overlays toggle in place without leaving scene.
<!-- SECTION:NOTES:END -->

