---
id: kgu42s
title: Generate usage-state variant pack for all rooms
status: blocked
priority: high
labels:
  - project-landnam
  - art-pipeline
  - states
  - rooms
createdAt: '2026-03-07T01:42:47.761Z'
updatedAt: '2026-03-10T07:19:04.810Z'
timeSpent: 0
parent: lg84kl
---
# Generate usage-state variant pack for all rooms

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute batch_usage_state_variants_all_rooms and align with runtime usage tiers and state keys.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All usage_* variants generated
- [ ] #2 State naming matches runtime conventions
- [ ] #3 Wear progression appears visually monotonic
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Blocked: requires external image-generation execution pipeline and human visual QA export process not available in this environment.

Execution spec ready: @doc/specs/chatgpt-room-asset-generation-execution-spec

Execution pack ready: scene/assets/Rooms/checklists/batches/execution/batch_usage_state_variants_all_rooms. Runbook: @doc/specs/kgu42s-chatgpt-execution-runbook.
<!-- SECTION:NOTES:END -->

