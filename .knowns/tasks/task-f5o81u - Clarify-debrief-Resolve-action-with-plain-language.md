---
id: f5o81u
title: Clarify debrief Resolve action with plain language
status: done
priority: medium
labels:
  - project-landnam
  - ux
  - debrief
  - copy
createdAt: '2026-03-08T02:33:07.257Z'
updatedAt: '2026-03-09T01:38:02.954Z'
timeSpent: 63
assignee: '@me'
---
# Clarify debrief Resolve action with plain language

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The debrief CTA says Resolve which is internal game language. First-time players hesitate unsure whether it is destructive, optional, or time-limited.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Resolve button is relabelled to something self-explanatory (e.g. Collect Payout or Complete Mission)
- [x] #2 Debrief screen shows a one-line summary of what the player will receive before they click
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated all 5 tutorial step messages to use plain 'sell cargo / scrap ship' language instead of 'resolve'. Also fixed error message in MissionDebrief.gd. AC #2 already satisfied by status_label showing estimated payout.
<!-- SECTION:NOTES:END -->

