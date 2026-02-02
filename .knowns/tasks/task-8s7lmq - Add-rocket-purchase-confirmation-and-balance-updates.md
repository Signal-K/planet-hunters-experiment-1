---
id: 8s7lmq
title: Add rocket purchase confirmation and balance updates
status: done
priority: medium
labels:
  - Launchpad
  - Economy
  - UX
createdAt: '2026-01-28T07:45:32.580Z'
updatedAt: '2026-01-28T07:54:18.582Z'
timeSpent: 514
assignee: '@me'
---
# Add rocket purchase confirmation and balance updates

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Require purchase confirmation before creating rockets in earth_launchpad.tscn; track user francs balance (start 10B, rockets cost 1B, refund on self-destruct).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 User must confirm purchase before rocket is created
- [x] #2 Creating a rocket deducts 1B francs from balance
- [x] #3 Self-destructing a rocket refunds 1B francs
- [x] #4 User starts with 10B francs
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect launchpad rocket creation and self-destruct flows; identify balance source and UI touchpoints.
2. Add purchase confirmation + balance check/deduct on rocket creation (click + drag) and return success from spawn.
3. Refund balance on self-destruct; keep AppController balance in sync; update defaults to 10B.
4. Sanity check behavior in launchpad and new mission panel (no tests run unless requested).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added purchase confirmation + balance checks for rocket creation (click + drag).
- Deducts 1B on successful spawn and refunds 1B on self-destruct.
- Default franc balance now starts at 10B in AppController.
<!-- SECTION:NOTES:END -->

