---
id: 82ysam
title: Fix transit screen safe area and text size on mobile
status: done
priority: high
labels:
  - project-landnam
  - mobile
  - pwa
  - layout
createdAt: '2026-03-09T01:09:34.867Z'
updatedAt: '2026-03-09T01:48:04.700Z'
timeSpent: 352
assignee: '@me'
---
# Fix transit screen safe area and text size on mobile

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On iPhone, the Dynamic Island/notch clips the top-left UI (Exit button, tutorial overlay, stats). Bottom nav buttons too close to screen edges. All text is too small. Needs safe area padding on all sides and larger font sizes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Top content clears Dynamic Island / notch
- [x] #2 Bottom buttons clear home indicator
- [x] #3 Text is readable at mobile scale
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added safe_top/safe_bottom (90 units) when aspect > 1.85 (landscape iPhone) in OutboundPreviewTransition and ReturnPreviewTransition. _ui_margin.offset_top adjusted for notch. travel/summary panels shifted down. bottom nav shifted up. Science panel and ship status panel font sizes upgraded from 11-13 to PanelStyle constants (34-40). PanelStyle title/body already at 52/40.
<!-- SECTION:NOTES:END -->

