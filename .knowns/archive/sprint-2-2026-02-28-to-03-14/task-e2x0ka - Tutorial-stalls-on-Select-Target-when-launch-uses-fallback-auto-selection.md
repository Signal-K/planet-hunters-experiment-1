---
id: e2x0ka
title: Tutorial stalls on 'Select Target' when launch uses fallback auto-selection
status: done
priority: high
labels:
  - tutorial
  - bug
  - launchpad
  - launch
createdAt: '2026-02-28T04:22:25.161Z'
updatedAt: '2026-02-28T07:06:47.800Z'
timeSpent: 0
---
# Tutorial stalls on 'Select Target' when launch uses fallback auto-selection

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the user presses Launch without explicitly clicking a target in the selector panel, LaunchpadLaunchButton calls ensure_selected_target_for_launch which auto-selects a fallback target. This does NOT call record_tutorial_action('select_launch_target'), so the tutorial remains stuck on the 'Select Target' step even after the rocket is in flight. This is the direct cause of the screenshot bug where the rocket is en route but the tutorial panel shows 'Select Target / Mission 1'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 LaunchpadLaunchButton records 'select_launch_target' tutorial action when ensure_selected_target_for_launch auto-selects a fallback target
- [x] #2 Tutorial advances past 'select_launch_target' step correctly when auto-selection is used
- [x] #3 Tutorial does not show 'Select Target' step while rocket is in transit
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Recorded select_launch_target in LaunchpadLaunchButton when ensure_selected_target_for_launch uses fallback auto-selection (lines 135-141).
<!-- SECTION:NOTES:END -->

