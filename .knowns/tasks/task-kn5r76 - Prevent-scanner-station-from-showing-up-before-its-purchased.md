---
id: kn5r76
title: Prevent scanner station from showing up before it's purchased
status: done
priority: high
labels:
  - stations
  - progress
  - bug
  - scanner
  - level2
createdAt: '2026-02-19T13:03:22.000Z'
updatedAt: '2026-02-25T00:26:17.625Z'
timeSpent: 690
assignee: '@me'
---
# Prevent scanner station from showing up before it's purchased

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The scanner structure should not be visible or clickable until the user purchases it, when it becomes available to purchase. There should be some dialogue that allows them to do this.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Scanner station hidden until mission stage 3
- [x] #2 Scanner station visible when unlocked
- [x] #3 Purchase dialog only shows when unlocked
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Changed _refresh_visibility() to check is_scanner_unlocked() instead of is_scanner_station_built(). Scanner station now hidden until mission stage 3, then becomes visible for purchase.
<!-- SECTION:NOTES:END -->

