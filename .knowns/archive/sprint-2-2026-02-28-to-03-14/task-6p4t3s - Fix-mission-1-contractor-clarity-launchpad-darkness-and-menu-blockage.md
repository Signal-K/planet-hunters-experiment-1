---
id: 6p4t3s
title: 'Fix mission-1 contractor clarity, launchpad darkness, and menu blockage'
status: done
priority: high
labels:
  - tutorial
  - launchpad
  - ui
  - bug
createdAt: '2026-03-14T04:05:49.351Z'
updatedAt: '2026-03-14T04:09:44.433Z'
timeSpent: 0
assignee: '@me'
---
# Fix mission-1 contractor clarity, launchpad darkness, and menu blockage

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make tutorial contractor step explicit, keep launchpad selector in non-blocking sidebar layout, and prevent selector overlay from blocking nav/menu interactions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission 1 contractor step explicitly tells player where/how to select contractor
- [x] #2 Launchpad selector panel no longer darkens most of the screen
- [x] #3 Menu button remains usable while launchpad selector is visible
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update tutorial contractor step copy and navigation hint to explicitly direct New Mission -> contractor Select action.
2. Refactor Launchpad selector layout to always use a left sidebar footprint (no full-screen overlay mode).
3. Lighten selector panel/card opacity to improve readability and reduce dark wash.
4. Ensure selector panel does not block bottom nav/menu interactions by footprint constraints.
5. Capture diff and summarize manual verification points.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Mission 1 contractor tutorial copy now explicitly instructs: New Mission -> Select contractor.
- Contractor targeting now detects actual contractor button labels (`Select`) inside selector panel paths.
- Launchpad selector panel now always renders as a left sidebar (no full-screen dark mode), reducing visual darkness and preventing nav/menu obstruction.
- Selector/planet card backgrounds were lightened for readability.
- Launchpad list order now prioritizes contractor section during contractor tutorial steps and hides mining-practice shortcut while linear tutorial is active.

## Validation
- Static code validation + diff review completed.
- Runtime confirmation pending user playthrough in Mission 1 launchpad flow.
<!-- SECTION:NOTES:END -->

