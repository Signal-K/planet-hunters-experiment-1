---
id: lg84kl
title: Create room prompt production docs and trimmed batches by ship/level
status: done
priority: high
labels:
  - project-landnam
  - art-pipeline
  - rooms
  - prompts
  - knowns
createdAt: '2026-03-07T01:39:18.045Z'
updatedAt: '2026-03-07T01:43:05.413Z'
timeSpent: 105
assignee: '@me'
---
# Create room prompt production docs and trimmed batches by ship/level

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Produce comparative room-system research (Pixel Starships + Out There Omega), align with current Planet Hunters game loop and RoomCatalog, and publish ordered prompt batches by ship type and progression level. Include follow-up execution tickets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Comparative design doc created with cited references
- [x] #2 Trimmed prompt batches generated for StarterRocket1/2/3 and levels
- [x] #3 Ordered generation workflow doc created
- [x] #4 Execution tickets created for production batches
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added benchmark doc: game-design/ship-room-benchmark-synthesis-pixel-starships-out-there-omega
- Added runbook doc: game-design/room-prompt-production-runbook-trimmed-batches-by-level-ship
- Generated trimmed batch artifacts for all active ship types/levels in scene/assets/Rooms/checklists/batches
- Added reusable generator: scripts/generate_trimmed_room_batches.mjs
- Created execution subtasks: j6tbdr, ci4oe8, xx1lbc, 45wpy1, kgu42s, h9n4sh

## Key outputs
- Batch index: scene/assets/Rooms/checklists/batches/index.md
- JSON/CSV/MD prompt lists per batch (7 batches total)
- Comparative external references included for Pixel Starships and Out There Omega
<!-- SECTION:NOTES:END -->

