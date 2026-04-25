---
id: 6rmj1u
title: 'Fix PWA iPhone layout: viewport, canvas fill, and flex sizing'
status: done
priority: high
labels:
  - pwa
  - mobile
  - iphone
  - bug
createdAt: '2026-03-08T08:48:23.760Z'
updatedAt: '2026-03-09T01:41:56.227Z'
timeSpent: 205
assignee: '@me'
---
# Fix PWA iPhone layout: viewport, canvas fill, and flex sizing

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Game appeared zoomed out and off-centre on iPhone when installed as a PWA. Missing viewport-fit=cover, broken flex+height on iframe, and no CSS fill on Godot canvas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 viewport-fit=cover added to index.html viewport meta
- [x] #2 PWA display-mode media query covers landscape iPhones (not just max-width:767px)
- [x] #3 iframe flex:1 + height:100% conflict resolved with minHeight:0
- [x] #4 Godot canvas fills iframe via width/height:100% on html, body, #canvas
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All 4 ACs already satisfied in current code. viewport-fit=cover in index.html. display-mode query covers landscape. PWA path uses position:fixed+inset:0 (no flex conflict). game/index.html has full canvas fill.
<!-- SECTION:NOTES:END -->

