---
id: ps6nfy
title: Design the SR2 unlock milestone moment
status: done
priority: medium
labels:
  - design
  - creative
createdAt: '2026-03-23T23:53:58.341Z'
updatedAt: '2026-03-28T00:18:49.550Z'
timeSpent: 0
assignee: '@me'
---
# Design the SR2 unlock milestone moment

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SR2 unlock is the first major progression reward. Decide: what does the 2–3s flash look like (gold pulse, star burst, or something else)? What copy appears? The shell already has a level-up banner. Write the exact headline + stats reveal copy (SR2: 2× speed · 2× range · 1.5× cargo) and any flavour text. Optionally sketch the visual idea. This directly unblocks ticket o59h32 for agent implementation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Celebration copy written (headline + stats)
- [x] #2 Visual direction described (even just words)
- [x] #3 Notes added to task for agent to implement
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Cross-reference the Knowns brief with the local board copy/flow and sketch tasks.
2. Replace the current SR2 popup in earth_base_1.gd with the designed two-step unlock moment, preserving the Earth-base background and adding the CTA.
3. Add validation for the SR2 unlock content and record the final copy/visual notes in the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Screen reference

The SR2 unlock celebration fires from this earth base state. The visual treatment (pulse, burst, animation) overlays this screen:

![Earth base post-Mission 1 — SR2 celebration context](https://raw.githubusercontent.com/Signal-K/planet-hunters-experiment-1/main/e2e/screenshots/ux-tour-earth-base-post-m1.png)

Design the celebration to work on top of this dark-sky / sci-fi aesthetic. The level-up banner appears in the top-right area of the shell (outside the game iframe).

✓ Implemented the SR2 unlock milestone in earth_base_1.gd using the board sketch + copy brief: two-step reveal over the Earth base, mission-complete intro, left rocket art, right-side stats/copy, and CTA into the next mission flow. Copy now calls out 2x speed, 24 AU range vs SR1's 12 AU, and 1.5x cargo. Validation: run_earth_base_unlock_tests passes in the Docker Godot environment.
<!-- SECTION:NOTES:END -->

