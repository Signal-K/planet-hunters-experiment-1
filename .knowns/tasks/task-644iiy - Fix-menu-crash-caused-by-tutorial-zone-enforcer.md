---
id: 644iiy
title: Fix menu crash caused by tutorial-zone enforcer
status: done
priority: high
labels:
  - menu
  - crash
  - ui
createdAt: '2026-03-14T04:11:55.870Z'
updatedAt: '2026-03-14T04:16:16.921Z'
timeSpent: 26
assignee: '@me'
---
# Fix menu crash caused by tutorial-zone enforcer

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent UIConsistencyEnforcer reserved-zone logic from mutating menu controls during menu open/instantiation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Opening Menu no longer crashes
- [x] #2 Menu controls are exempt from tutorial reserved-zone relocation
- [x] #3 Tutorial reserved-zone behavior still applies outside menu
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Marked instantiated menu panel as `tutorial_zone_exempt` in AppController before adding to menu layer.
- UIConsistencyEnforcer now skips tutorial reserved-zone enforcement while menu is open.
- Added guard checks to avoid relocating controls that are queued for deletion or not in tree.

## Validation
- Crash path addressed at menu-open + enforcer intersection point.
- Please verify in runtime: press Menu from earth base and launchpad scenes repeatedly.

Reopened: hard-bypassed MenuOverlayLayer from tutorial-zone enforcer and recursively set tutorial_zone_exempt on all menu controls.
<!-- SECTION:NOTES:END -->

