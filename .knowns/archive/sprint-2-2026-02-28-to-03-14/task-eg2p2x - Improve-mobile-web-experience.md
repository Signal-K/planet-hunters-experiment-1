---
id: eg2p2x
title: Improve mobile web experience
status: done
priority: high
labels:
  - ux
  - mobile
  - web
  - accessibility
createdAt: '2026-03-01T10:21:23.190Z'
updatedAt: '2026-03-01T11:51:30.867Z'
timeSpent: 0
---
# Improve mobile web experience

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tester feedback: 'The mobile experience for the web app is horrible - the text is very bad.' Multiple UX issues on mobile: text sizing, layout, button hit targets. The react-shell.js already has isMobile detection (window.innerWidth < 768) but the Godot canvas layout and UI scaling need work for mobile viewports.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Text is legible without zooming on a typical mobile screen (375px wide)
- [ ] #2 All interactive buttons have adequate hit targets (min 44px)
- [ ] #3 No UI elements overflow or clip on mobile
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shell (react-shell.js + index.html): on mobile (<768px) heading and metadata strip are hidden, main padding removed, iframe fills 100svh full-bleed. Viewport meta now has user-scalable=no + maximum-scale=1. Body gets overflow:hidden + overscroll-behavior:none on mobile. Desktop experience unchanged.
<!-- SECTION:NOTES:END -->

