---
id: hkf1h6
title: Create starter yield algo
status: done
priority: medium
labels:
  - Algorithms
  - Yield
  - Mining
  - Procedural-Generation
createdAt: '2026-01-21T01:04:44.640Z'
updatedAt: '2026-02-02T03:05:58.941Z'
timeSpent: 309
assignee: '@me'
---
# Create starter yield algo

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pretty simple - show cost, same mass value for all planets and same mass value for all asteroids, differing monetary yield value depending on composition; consistent starter ship price
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace target data flow (detected targets → preview) and decide where to store target type for yield calc.
2. Implement deterministic mineral yield helper (planet base capacity, asteroid at 20%) and hook into preview UI.
3. Add minerals panel to asteroid preview scene and populate it from the helper.
4. Quick sanity check in preview flow (no runtime errors, UI updates).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added deterministic mineral yield helper (planet base capacity, asteroid at 20%).
- Stored target type in detected targets and preview target.
- Added minerals panel to preview scene and populated UI with yield.
<!-- SECTION:NOTES:END -->

