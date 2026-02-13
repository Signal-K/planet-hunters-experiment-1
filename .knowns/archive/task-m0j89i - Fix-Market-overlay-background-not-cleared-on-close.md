---
id: m0j89i
title: Fix Market overlay background not cleared on close
status: done
priority: high
labels:
  - ui
  - bug
createdAt: '2026-02-06T07:18:11.875Z'
updatedAt: '2026-02-06T07:22:42.921Z'
timeSpent: 226
assignee: '@me'
---
# Fix Market overlay background not cleared on close

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Closing Market leaves overlay/background over Earth base. Ensure overlay is removed when panel closes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Market overlay is fully removed on close
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Identify Market panel creation path (UIManager -> PanelManager)
2. Fix close handler to remove overlay wrapper
3. Validate close removes entire panel + overlay
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Market panel close now removes the full wrapper (overlay + panel).

## Files
- scene/Scripts/Utils/PanelManager.gd
<!-- SECTION:NOTES:END -->

