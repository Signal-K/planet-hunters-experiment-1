---
id: ceyf0n
title: Align mining laser origin to rocket tip in preview
status: done
priority: medium
labels:
  - UI
  - Preview
  - Mining
createdAt: '2026-02-04T09:46:10.275Z'
updatedAt: '2026-02-04T09:52:06.978Z'
timeSpent: 320
assignee: '@me'
---
# Align mining laser origin to rocket tip in preview

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update orbit rocket sprite sizing/offsets and mining laser origin so beam starts at the rocket tip after sprite crop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mining beam originates from rocket tip in asteroid preview
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Locate mining beam origin calculation in asteroid preview.
2. Update rocket sprite/container offsets to match the new 534x534 crop.
3. Adjust beam origin to align with the rocket tip and verify visually.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Adjusted mining beam origin to use the rocket tip based on the current sprite frame size.
<!-- SECTION:NOTES:END -->

