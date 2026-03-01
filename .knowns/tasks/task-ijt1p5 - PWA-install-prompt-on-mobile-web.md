---
id: ijt1p5
title: PWA install prompt on mobile web
status: todo
priority: medium
labels:
  - mobile
  - pwa
  - ux
createdAt: '2026-03-01T16:06:20.094Z'
updatedAt: '2026-03-01T16:06:20.094Z'
timeSpent: 0
---
# PWA install prompt on mobile web

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On mobile browsers, show a banner 2s after load prompting users to either open fullscreen mode or install the game as a PWA. Implemented in react-shell.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Banner appears on mobile non-PWA sessions after ~2s
- [ ] #2 Open Fullscreen button triggers Fullscreen API
- [ ] #3 Install App button triggers beforeinstallprompt on Android
- [ ] #4 Add to Home Screen button shows iOS share sheet instructions on iOS
- [ ] #5 Banner can be dismissed
<!-- AC:END -->

