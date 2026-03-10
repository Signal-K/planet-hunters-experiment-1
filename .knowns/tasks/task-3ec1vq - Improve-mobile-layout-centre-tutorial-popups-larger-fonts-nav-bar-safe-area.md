---
id: 3ec1vq
title: 'Improve mobile layout: centre tutorial popups, larger fonts, nav bar safe area'
status: done
priority: medium
labels:
  - mobile
  - ux
  - pwa
createdAt: '2026-03-09T00:57:43.065Z'
updatedAt: '2026-03-10T05:42:36.976Z'
timeSpent: 0
---
# Improve mobile layout: centre tutorial popups, larger fonts, nav bar safe area

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TSP reference comparison revealed three mobile layout issues: tutorial coach overlay defaults to top-left corner instead of centred; font sizes 22-26px render ~11px CSS on iPhone; nav bar has 8px bottom gap leaving it behind the home indicator.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutorial popups centred on mobile landscape viewports
- [x] #2 Font sizes readable on iPhone (bumped ~25%)
- [x] #3 Nav bar clears iPhone home indicator
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Tutorial coach positioning already centered for wide mobile landscape; mobile-readable HUD/tutorial font sizing present in SidescrollMining; shell mobile bottom banner now accounts for safe-area inset bottom.
<!-- SECTION:NOTES:END -->

