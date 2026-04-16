---
id: uchxcz
title: Clicking skip from the launch scene occasionally...
status: done
priority: high
labels:
  - bug
  - regression
  - launch-sequence
  - persistence
  - critical
createdAt: '2026-04-21T07:52:56.518Z'
updatedAt: '2026-04-21T11:19:29.929Z'
timeSpent: 0
assignee: '@me'
parent: phx002
---
# Clicking skip from the launch scene occasionally...

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
results in a broken game/scene - just the background scene with stars. The rocket is invisible.

Also, if you refresh and go back, even though the rocket launched, the game makes you go through the assembley and mission selection again. This should all be saved...
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fix scene break on skip/transition
- [x] #2 Persist rocket state during assembly/launch phases
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Update - this happens even when the skip button isn't pressed

Likely regression from @task-p9x3kw or @task-r8mxvw
<!-- SECTION:NOTES:END -->

