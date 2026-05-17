---
id: 6zmy8j
title: PWA game-focused layout when installed
status: done
priority: medium
labels:
  - project-landnam
  - mobile
  - pwa
  - ux
createdAt: '2026-03-01T16:06:27.601Z'
updatedAt: '2026-03-07T01:14:21.073Z'
timeSpent: 230
assignee: '@me'
---
# PWA game-focused layout when installed

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the app is opened as an installed PWA (fullscreen/standalone display mode), show a minimal header with an Exit button and let the game iframe fill the remaining viewport height. Implemented in react-shell.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 isPwaMode() correctly detects fullscreen, standalone, and iOS standalone
- [x] #2 PWA mode renders slim top bar with Exit button and game iframe filling 100svh
- [x] #3 Exit button navigates back in history or closes the tab
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ AC1-3 implemented in react-shell.js; expanded PWA detection to standalone/fullscreen/minimal-ui + iOS standalone + fullscreen element; ensured 100svh/min-height container + safe-area header + iframe full-height fill.
<!-- SECTION:NOTES:END -->

