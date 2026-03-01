---
id: 6zmy8j
title: PWA game-focused layout when installed
status: todo
priority: medium
labels:
  - mobile
  - pwa
  - ux
createdAt: '2026-03-01T16:06:27.601Z'
updatedAt: '2026-03-01T16:06:27.601Z'
timeSpent: 0
---
# PWA game-focused layout when installed

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the app is opened as an installed PWA (fullscreen/standalone display mode), show a minimal header with an Exit button and let the game iframe fill the remaining viewport height. Implemented in react-shell.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 isPwaMode() correctly detects fullscreen, standalone, and iOS standalone
- [ ] #2 PWA mode renders slim top bar with Exit button and game iframe filling 100svh
- [ ] #3 Exit button navigates back in history or closes the tab
<!-- AC:END -->

