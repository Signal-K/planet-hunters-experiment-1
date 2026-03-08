---
id: ijt1p5
title: PWA install prompt on mobile web
status: done
priority: medium
labels:
  - mobile
  - pwa
  - ux
createdAt: '2026-03-01T16:06:20.094Z'
updatedAt: '2026-03-07T01:18:59.293Z'
timeSpent: 59
assignee: '@me'
---
# PWA install prompt on mobile web

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On mobile browsers, show a banner 2s after load prompting users to either open fullscreen mode or install the game as a PWA. Implemented in react-shell.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Banner appears on mobile non-PWA sessions after ~2s
- [x] #2 Open Fullscreen button triggers Fullscreen API
- [x] #3 Install App button triggers beforeinstallprompt on Android
- [x] #4 Add to Home Screen button shows iOS share sheet instructions on iOS
- [x] #5 Banner can be dismissed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review current mobile banner logic in react-shell.js
2. Wire full mobile install actions (fullscreen, beforeinstallprompt, iOS A2HS guidance)
3. Ensure dismiss behavior and delayed appearance in non-PWA mobile
4. Update pwa spec doc and check ACs
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Mobile non-PWA banner shows after ~2s; wired fullscreen action; install action uses beforeinstallprompt when available; iOS shows Add to Home Screen guidance; dismiss button hides banner.
<!-- SECTION:NOTES:END -->

