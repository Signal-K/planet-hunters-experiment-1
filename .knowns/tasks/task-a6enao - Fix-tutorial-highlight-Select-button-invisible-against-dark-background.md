---
id: a6enao
title: 'Fix tutorial highlight: Select button invisible against dark background'
status: done
priority: high
labels:
  - tutorial
  - ux
  - onboarding
createdAt: '2026-03-21T01:38:27.131Z'
updatedAt: '2026-03-21T01:43:12.428Z'
timeSpent: 0
---
# Fix tutorial highlight: Select button invisible against dark background

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
During onboarding, the tutorial-highlighted 'Select' button blends into the dark panel background because both the highlight overlay and the button are the same dark cyan/navy palette. Player cannot tell it's clickable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutorial highlight overlay has a visible bg fill (not fully transparent)
- [x] #2 Contractor 'Select' button uses amber/primary styling when active so it stands out
- [x] #3 Highlight pulse animation makes the target visually obvious
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed in TutorialCoachOverlay.gd: highlight now has 0.12 alpha fill + pulsing tween (0.08↔0.30 SINE). Fixed in LaunchpadSelectorPanel.gd: contractor Select button uses amber primary style (apply_button true) when not disabled.
<!-- SECTION:NOTES:END -->

