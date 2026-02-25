---
id: f82pml
title: Add interactive mining tutorial with pause
status: done
priority: high
labels:
  - mining
  - tutorial
  - ux
createdAt: '2026-02-25T02:40:45.808Z'
updatedAt: '2026-02-25T02:43:59.464Z'
timeSpent: 67
assignee: '@me'
---
# Add interactive mining tutorial with pause

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tutorial should pause rocket movement, guide user to mine surface deposits (explain colors), then teach drone usage for subsurface deposits before allowing continuation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Rocket pauses during tutorial steps
- [x] #2 Tutorial explains mineral colors and values
- [x] #3 Surface mining tutorial step works
- [x] #4 Drone tutorial step works
- [x] #5 Rocket resumes after tutorial complete
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented interactive tutorial: INTRO → mine Iron → mine Nickel → explain subsurface → deploy drone → complete. Rocket pauses (_tutorial_paused) during each step. Tracks _surface_mined_count to progress. Explains mineral colors and drone usage.
<!-- SECTION:NOTES:END -->

