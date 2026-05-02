---
id: ogmedx
title: Improve mobile UI panel for asteroid detail flow
status: done
priority: high
labels:
  - ux
  - ui
  - mobile
  - layout
  - asteroid-detail
createdAt: '2026-03-28T00:09:55.468Z'
updatedAt: '2026-03-28T00:18:49.550Z'
timeSpent: 0
---
# Improve mobile UI panel for asteroid detail flow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the asteroid detail / annotation panel usable on narrow and mobile-sized viewports. This appears to be the likely surface referenced as the asteroid bundler panel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Asteroid detail header/actions stay reachable on narrow/mobile-sized viewports
- [x] #2 Asteroid image and drawing canvas remain visible without horizontal overflow
- [x] #3 Related overflow issues found during the mobile asteroid-detail pass are fixed or documented
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit asteroid detail layout on narrow/mobile-sized viewports and identify the header, image, and annotation controls that overflow.
2. Refactor asteroid_detail_view.tscn and AsteroidDetailView.gd to use responsive wrapping/scrolling and viewport-aware sizing.
3. Re-run targeted UI validation and document any linked overflow fixes or residual limits.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Asteroid detail panel reworked for narrow/mobile layouts: wrapped tool row, scrollable body, viewport-aware image/canvas sizing, and classification actions moved into responsive flow containers. Validation: Docker smoke load confirmed new nodes render; full UX tour blocked by unrelated SidescrollMining parse errors.
<!-- SECTION:NOTES:END -->

