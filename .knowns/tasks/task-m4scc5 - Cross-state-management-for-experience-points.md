---
id: m4scc5
title: Cross-state management for experience points
status: done
priority: medium
labels:
  - project-landnam
  - Supabase
  - Experience
  - Points
  - Data
  - State
  - Research
createdAt: '2026-01-25T01:37:32.507Z'
updatedAt: '2026-02-27T09:05:26.101Z'
timeSpent: 0
assignee: '@me'
parent: vvgprh
---
# Cross-state management for experience points

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ability to have it saved in expo and godot, and obviously then backed up to the sb profile
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented:
- Added web-side XP state persistence key and sync logic in React shell + static web shell.
- Captured experience payloads from game bridge events and persisted them to local storage.
- Added best-effort Supabase profile metadata sync for experience level/xp updates.
- Added Godot-side web localStorage load/save bridge for experience state continuity.
<!-- SECTION:NOTES:END -->

