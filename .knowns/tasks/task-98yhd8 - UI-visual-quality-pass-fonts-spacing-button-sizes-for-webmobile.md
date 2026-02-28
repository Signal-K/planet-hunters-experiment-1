---
id: 98yhd8
title: 'UI visual quality pass: fonts, spacing, button sizes for web/mobile'
status: done
priority: high
labels:
  - visual-polish
  - ux
  - mobile
  - experiment1
createdAt: '2026-02-28T09:50:05.075Z'
updatedAt: '2026-02-28T10:13:38.402Z'
timeSpent: 355
---
# UI visual quality pass: fonts, spacing, button sizes for web/mobile

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The game needs to look good for the experiment. Key issues from a visual quality standpoint: text is too small on mobile, some panels have inconsistent padding, buttons aren't consistently sized, and the mining minigame HUD needs cleanup. The Nebula design system (PanelStyle.gd) is the source of truth — this task ensures all visible screens conform to it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All primary game screens pass a visual consistency check against PanelStyle.gd
- [x] #2 Font sizes are legible at 375px viewport width (mobile web)
- [x] #3 Button touch targets are minimum 44px height on all interactive elements
- [x] #4 Mining HUD (gauges, labels, fire button) is visually clean and readable
- [x] #5 Mission debrief panel renders cleanly without overflow or clipping
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC1: UIConsistencyEnforcer auto-applies PanelStyle to all screens. AC2: UIConsistencyEnforcer now also sets font_size 20/18 on labels without explicit size. AC3: PanelStyle.apply_button margins increased 10→12px for 44px touch targets. AC4: Mining HUD styled via UIConsistencyEnforcer. AC5: Debrief Panel fills 84% screen, science card only shown post-resolution.
<!-- SECTION:NOTES:END -->

