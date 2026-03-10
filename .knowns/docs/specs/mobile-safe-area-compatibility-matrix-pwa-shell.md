---
title: Mobile Safe-Area Compatibility Matrix (PWA Shell)
createdAt: '2026-03-10T06:12:07.928Z'
updatedAt: '2026-03-10T06:12:29.622Z'
description: >-
  Device/orientation matrix for notch/cutout/dynamic-island safe control
  placement
tags:
  - spec
  - mobile
  - pwa
  - ux
  - safe-area
---
# Mobile Safe-Area Compatibility Matrix (PWA Shell)

## Objective
Ensure actionable controls never overlap cutouts/notches/dynamic-island/gesture regions while preserving full-screen visual background.

## Device Families
- iPhone regular
- iPhone Pro Max
- Nothing Phone
- Samsung Galaxy series
- Google Pixel series

## Operating Rules
1. Background layers remain edge-to-edge full-screen.
2. Interactive controls must be inset using `env(safe-area-inset-top/right/bottom/left)`.
3. Top HUD controls remain compact and auto-hide to reduce UI coverage.
4. Bottom banners/CTA rows include left/right/bottom inset padding.
5. Landscape mode must respect side insets for left/right camera cutouts.

## PWA State Matrix

### Installed PWA (standalone/fullscreen/minimal-ui)
- Portrait:
  - Top control cluster starts below `safe-area-inset-top`.
  - Horizontal max width constrained by left/right insets.
- Landscape:
  - Top cluster and bottom controls inset from `safe-area-inset-left/right`.
  - No button may sit under camera cutout side.

### Browser (non-installed)
- Portrait:
  - Mobile banner honors bottom + side insets.
  - Fullscreen button remains visible and unobstructed.
- Landscape:
  - Side insets applied to all fixed controls.
  - Avoid edge-clipped CTA labels.

## Regression Checklist
- iPhone regular portrait/landscape:
  - Show HUD handle is tappable and not under notch/dynamic island.
  - Save/Exit buttons remain fully tappable.
- iPhone Pro Max portrait/landscape:
  - Top control chip is not clipped by island/cutout.
  - Bottom banners clear gesture area.
- Pixel/Samsung/Nothing portrait/landscape:
  - Side cutout areas do not overlap fixed buttons.
  - Banner text/buttons remain readable and tappable.

## Verification Notes
- Manual check: installed PWA + browser mode.
- Manual check: rotate while HUD visible and while banner visible.
- Visual pass requirement: no fixed control exceeds safe-content frame.

## Implementation Anchors
- Shell layout and fixed controls: `react-shell.js`
- PWA behavior spec: @doc/specs/pwa-standalone-game-shell-layout-behavior
- Decision lock: @doc/specs/post-m4-free-ops-product-decisions-2026-03-10
