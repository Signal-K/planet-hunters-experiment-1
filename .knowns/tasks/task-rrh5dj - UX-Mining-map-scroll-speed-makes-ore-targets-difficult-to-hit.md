---
id: rrh5dj
title: 'UX: Mining map scroll speed makes ore targets difficult to hit'
status: done
priority: high
labels:
  - project-landnam
  - ux
  - mining
  - difficulty
  - gameplay
createdAt: '2026-03-16T03:50:46.448Z'
updatedAt: '2026-03-16T06:49:18.265Z'
timeSpent: 0
---
# UX: Mining map scroll speed makes ore targets difficult to hit

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The mining side-scroll map has variable/random speed intervals that make it very hard to position the mining beam on target ores. Combined with limited time, mission goals feel unattainable. Speed should feel controllable and fair.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Scroll speed is consistent or player has some control over timing
- [ ] #2 Target ore appears on screen long enough to mine it realistically
- [ ] #3 Mission completion is achievable on a first or second attempt for new players
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed: SCROLL_SPEED reduced 120→75, slowdown_range widened 120→180px. This gives 38% slower scrolling and longer slow zones near ore deposits.
<!-- SECTION:NOTES:END -->

