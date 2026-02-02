---
id: jwbgbj
title: Polish UI panels + mission timing progress
status: done
priority: medium
labels:
  - UI
  - Scene
  - New-Mission
  - Navigation
  - Menu
  - Button
createdAt: '2026-01-29T00:12:47.647Z'
updatedAt: '2026-02-01T05:35:13.352Z'
timeSpent: 2359
assignee: '@me'
---
# Polish UI panels + mission timing progress

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make all UI panels adopt a white, futuristic style (rounded corners, shadows, larger typography). Add mission distance progress bar based on 60s travel and store real launch time (unix). Potential parent: mzl2k8 (Launch mission) or 0x09aq (Create mission preview scene/view).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All UI panels use a cohesive white, rounded, shadowed style with larger typography
- [x] #2 Mission list shows a distance progress bar reflecting real-time 0–60s travel
- [ ] #3 Launch time is recorded using real unix time and used for progress
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit all panel scenes/scripts under scene/Scenes/UI and identify shared nodes to restyle (panels, headers, buttons, labels).
2. Implement a reusable panel styling helper (Script/Util) and apply to all panel scenes for white/rounded/shadowed/large typography.
3. Add mission progress bar UI to NewMission mission list rows and update logic to compute progress via unix launch_time + 60s travel.
4. Ensure launch time is recorded with real unix time at launch and progress updates in real time.
5. Verify panel visuals + mission progress behavior.
<!-- SECTION:PLAN:END -->

