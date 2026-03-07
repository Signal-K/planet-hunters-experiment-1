---
id: q5z1xo
title: >-
  Ensure that reward for finishing mission 2 (including salvaging/scrapping the
  rocket) is 1.3* the cost of the rocket/what's needed to perform the level
status: done
priority: high
labels:
  - minerals
  - rewards
  - missions
  - narrative
  - early
  - tutorial
createdAt: '2026-02-18T22:42:38.000Z'
updatedAt: '2026-02-18T14:57:22.304Z'
timeSpent: 643
assignee: '@me'
---
# Ensure that reward for finishing mission 2 (including salvaging/scrapping the rocket) is 1.3* the cost of the rocket/what's needed to perform the level

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
First mission - starterrocket1, 1.2 * cost of starterrocket1 should be the rough value of all the minerals mined and the scrapped value of the rocket (which is a flat 20% of the original cost of the rocket). Second mission - 1.3 * cost of starterrocket2 (because this is the rocket that's used for mission 2).
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add mission-target economy tuning so Mission 1 and Mission 2 full-mine + scrap totals hit 1.2x/1.3x goals while keeping salvage at 20%.
2. Update mining/economy tests to assert the new ratio targets.
3. Run headless mining tests and record results.
4. Mark AC complete and add concise implementation notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Tuned mission target economy: M1 full mine+scrap ~1.2x SR1, M2 ~1.3x SR2 via mission target capacity tuning; salvage stays 20%. Added reward ratio metadata + mining/experience tests.
<!-- SECTION:NOTES:END -->

