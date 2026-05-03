---
id: hn026g
title: 'Portrait mode support — game requires landscape but browser users don''t always rotate'
status: todo
priority: medium
labels:
  - mobile,portrait,ux,layout
createdAt: '2026-05-03T11:40:58.944Z'
updatedAt: '2026-05-03T11:40:58.944Z'
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
- [ ] #1 Portrait rotate prompt shows on tablets (not just phones/PWA)
- [ ] #2 Prompt fires when viewportWidth < 1200 and orientation is portrait
- [ ] #3 Consider a portrait-native informational layout (future task)
<!-- AC:END -->

