---
id: hn026g
title: >-
  Portrait mode support — game requires landscape but browser users don't always
  rotate
status: done
priority: medium
labels:
  - 'mobile,portrait,ux,layout'
createdAt: '2026-05-03T11:40:58.944Z'
updatedAt: '2026-05-06T02:16:26.691Z'
timeSpent: 0
assignee: '@Liam'
---
# Portrait mode support — game requires landscape but browser users don't always rotate

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In landscape mode on a browser (non-PWA), users see the browser tab bar eating into the game viewport. Portrait mode shows only a rotate-device prompt. The rotate prompt was previously restricted to isMobile/isPwa only; tablets in portrait (browser mode) got no prompt. Fix applied: portrait rotate prompt now triggers for any device with viewportWidth < 1200 in portrait orientation (covers phones and tablets). Long-term: consider a lightweight portrait layout that shows HUD summary / mission status without requiring Godot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Portrait rotate prompt shows on tablets (not just phones/PWA)
- [x] #2 Prompt fires when viewportWidth < 1200 and orientation is portrait
- [ ] #3 Consider a portrait-native informational layout (future task)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified in react-shell.js on 2026-05-06 that the rotate prompt now shows whenever the viewport is portrait and width is below 1200px, which covers tablets in browser mode as described by the ticket.
<!-- SECTION:NOTES:END -->

