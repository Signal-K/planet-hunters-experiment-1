---
id: gu5376
title: Write copy and flow for the Starter Rocket 2 unlock screen
status: done
priority: medium
labels:
  - liam-sprint
  - writing
  - design
createdAt: '2026-03-24T00:17:01.035Z'
updatedAt: '2026-03-27T12:09:05.310Z'
timeSpent: 0
assignee: '@me'
---
# Write copy and flow for the Starter Rocket 2 unlock screen

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a player hits level 3, SR2 unlocks but nothing meaningful happens. Write the screen copy — headline, what stats to highlight (2x speed, 2x range, 1.5x cargo), and the CTA. Also describe the visual flow: what shows on screen, in what order, for how long. This is the spec the developer needs to implement it.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read the SR2 sketch and compare it to the current earth-base unlock popup.
2. Capture the layout decisions from the notebook in Knowns: two-step beat, left rocket art, right-side stat reveal, Earth-base background preserved, CTA into using SR2.
3. Implement the SR2 unlock screen in earth_base_1.gd so the post-debrief flow matches the sketch and the written flow task.
4. Add focused tests for the unlock overlay content and CTA presence.
5. Write notes, stop the timer, and close the task if validation passes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented SR2 unlock copy and flow in earth_base_1.gd.

Copy + flow
- Intro copy: Mission complete. Starter Rocket 2 unlocked.
- Main title: Starter Rocket 2
- Summary copy explains that the first mission unlocks a faster ship with more range and cargo
- Highlighted upgrades: Speed 2.0x, Range 2.0x, Cargo 1.5x
- Secondary line includes cost, mining output, and salvage refund
- CTA: Build Starter Rocket 2

Validation
- PASS: run_earth_base_unlock_tests.gd
<!-- SECTION:NOTES:END -->

