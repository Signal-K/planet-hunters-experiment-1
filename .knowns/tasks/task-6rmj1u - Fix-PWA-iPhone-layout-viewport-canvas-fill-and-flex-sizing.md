---
id: 6rmj1u
title: 'Fix PWA iPhone layout: viewport, canvas fill, and flex sizing'
status: todo
priority: high
labels:
  - pwa
  - mobile
  - iphone
  - bug
createdAt: '2026-03-08T08:48:23.760Z'
updatedAt: '2026-03-08T08:48:23.760Z'
timeSpent: 0
---
# Fix PWA iPhone layout: viewport, canvas fill, and flex sizing

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Game appeared zoomed out and off-centre on iPhone when installed as a PWA. Missing viewport-fit=cover, broken flex+height on iframe, and no CSS fill on Godot canvas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 viewport-fit=cover added to index.html viewport meta
- [ ] #2 PWA display-mode media query covers landscape iPhones (not just max-width:767px)
- [ ] #3 iframe flex:1 + height:100% conflict resolved with minHeight:0
- [ ] #4 Godot canvas fills iframe via width/height:100% on html, body, #canvas
<!-- AC:END -->

