---
id: zll49b
title: Haptic feedback via navigator.vibrate on key actions
status: done
priority: medium
labels:
  - mobile
  - feel
  - shell
createdAt: '2026-03-01T16:16:07.523Z'
updatedAt: '2026-03-01T16:22:18.851Z'
timeSpent: 0
---
# Haptic feedback via navigator.vibrate on key actions

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add shell-side haptic feedback (navigator.vibrate) triggered by postMessage events: mine hit, rocket land, reward collected. Low-effort mobile feel improvement.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mine hit event triggers a short vibration pattern
- [x] #2 Rocket land / mission complete triggers a distinct vibration pattern
- [x] #3 Vibrate calls are no-op on desktop (API absent)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
vibrate() helper wraps navigator.vibrate with try/catch. mine_hit → [30]ms, rocket_landed/mission events → [60,40,60], level-up → [80,60,120]. No-ops on desktop.
<!-- SECTION:NOTES:END -->

