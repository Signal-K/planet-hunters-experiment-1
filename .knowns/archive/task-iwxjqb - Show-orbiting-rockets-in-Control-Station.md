---
id: iwxjqb
title: Show orbiting rockets in Control Station
status: done
priority: medium
labels:
  - ui
  - godot
createdAt: '2026-02-05T14:17:24.994Z'
updatedAt: '2026-02-05T14:19:51.083Z'
timeSpent: 0
---
# Show orbiting rockets in Control Station

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Control Station panel should display rockets currently orbiting Earth.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Control Station shows list of orbiting rockets
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect Control Station panel UI + data flow for orbiting rockets
2. Wire RocketsManager orbiting data into the panel list
3. Confirm list updates when rockets enter orbit
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added Orbiting Rockets section to Control Station panel and populated from RocketsManager
<!-- SECTION:NOTES:END -->

