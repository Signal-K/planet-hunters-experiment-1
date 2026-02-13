---
id: emzz1a
title: Skip transit scene when rocket already arrived
status: done
priority: medium
labels:
  - UI
  - Preview
createdAt: '2026-02-04T09:40:52.766Z'
updatedAt: '2026-02-04T09:44:13.863Z'
timeSpent: 167
assignee: '@me'
---
# Skip transit scene when rocket already arrived

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent showing the RocketTransit scene for a few seconds when previewing a target with an already-arrived rocket.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Preview jumps directly to target/ship view when rocket arrival time has passed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Locate the RocketTransit flow and how preview transitions are triggered.
2. Detect arrived rockets before showing the transit scene.
3. Route directly to the preview scene when arrival time has passed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Skip RocketTransit when previewing a mission whose arrival_time has already passed.
<!-- SECTION:NOTES:END -->

