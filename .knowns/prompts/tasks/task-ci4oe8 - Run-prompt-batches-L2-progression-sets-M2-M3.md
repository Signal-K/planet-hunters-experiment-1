---
id: ci4oe8
title: Run prompt batches L2 progression sets (M2 + M3)
status: blocked
priority: high
labels:
  - art-pipeline
  - rooms
  - prompts
createdAt: '2026-03-07T01:42:47.089Z'
updatedAt: '2026-03-10T07:19:00.305Z'
timeSpent: 0
parent: lg84kl
---
# Run prompt batches L2 progression sets (M2 + M3)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute batch_l2_m2_starterrocket2 and batch_l2_m3_starterrocket2 to cover upgrade and scanner-intro visuals.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 M2 batch generated and exported
- [ ] #2 M3 scanner-intro batch generated and exported
- [ ] #3 Inconsistencies flagged against style anchor
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Blocked: requires external image-generation execution pipeline and human visual QA export process not available in this environment.

Execution spec ready: @doc/specs/chatgpt-room-asset-generation-execution-spec

Execution pack ready: scene/assets/Rooms/checklists/batches/execution/batch_l2_m2_starterrocket2 + .../batch_l2_m3_starterrocket2. Runbook: @doc/specs/ci4oe8-chatgpt-execution-runbook.
<!-- SECTION:NOTES:END -->

