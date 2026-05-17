---
id: qf9btm
title: Star map placeholder on base screen
status: done
priority: medium
labels:
  - project-landnam
  - progression
  - ui
  - retention
createdAt: '2026-03-01T16:16:06.866Z'
updatedAt: '2026-03-07T01:30:37.830Z'
timeSpent: 6
assignee: '@me'
---
# Star map placeholder on base screen

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players have no sense of the wider world. Add a placeholder star map panel to the base screen showing discovered planets (e.g. 'Discovered: 1 / ???') to communicate goal and scale.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Base screen shows a star map or placeholder panel
- [x] #2 Discovered planet count is visible
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add star map placeholder panel to Earth base scene
2. Surface discovered planet count as Discovered: X / ???
3. Wire panel CTA to Space Map scene
4. Validate load and close task
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added Star Map placeholder card on Earth base with discovered count text (Discovered: X / ??? planets) derived from seen_planets + detected target fallback; CTA wired to _on_space_map_button_pressed().
<!-- SECTION:NOTES:END -->

