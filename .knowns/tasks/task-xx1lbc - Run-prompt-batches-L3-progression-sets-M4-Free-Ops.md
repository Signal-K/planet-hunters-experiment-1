---
id: xx1lbc
title: Run prompt batches L3 progression sets (M4 + Free Ops)
status: blocked
priority: high
labels:
  - project-landnam
  - art-pipeline
  - rooms
  - prompts
createdAt: '2026-03-07T01:42:47.311Z'
updatedAt: '2026-03-10T07:19:02.556Z'
timeSpent: 0
parent: lg84kl
---
# Run prompt batches L3 progression sets (M4 + Free Ops)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute batch_l3_m4_starterrocket3 and batch_l3_free_ops_starterrocket3 for planetary and free-operations interiors.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 M4 batch generated and exported
- [ ] #2 Free Ops batch generated and exported
- [ ] #3 Late-loop rooms validated for readability at small scale
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Blocked/re-scope needed: batch includes Mission 5 content, but current spec is M1-M4 + Free Operations. Needs new batch definition before generation.

Rescoped from M4+M5 to M4+Free Ops to match current mission spec; generated batch definitions now emit batch_l3_free_ops_starterrocket3.

Execution spec ready: @doc/specs/chatgpt-room-asset-generation-execution-spec

Execution pack ready: scene/assets/Rooms/checklists/batches/execution/batch_l3_m4_starterrocket3 + .../batch_l3_free_ops_starterrocket3. Runbook: @doc/specs/xx1lbc-chatgpt-execution-runbook.
<!-- SECTION:NOTES:END -->

