---
id: j6tbdr
title: Run prompt batch L1/M1 StarterRocket1 core set
status: blocked
priority: high
labels:
  - art-pipeline
  - rooms
  - prompts
createdAt: '2026-03-07T01:42:46.869Z'
updatedAt: '2026-03-10T07:14:59.349Z'
timeSpent: 0
parent: lg84kl
---
# Run prompt batch L1/M1 StarterRocket1 core set

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute generated prompts in batch_l1_m1_starterrocket1 using style anchor workflow and archive outputs for import.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All prompts in batch_l1_m1_starterrocket1 generated
- [ ] #2 Outputs stored with stable naming by asset_id
- [ ] #3 Quick visual QA pass logged
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Blocked: requires external image-generation execution pipeline and human visual QA export process not available in this environment.

Execution spec ready: @doc/specs/chatgpt-room-asset-generation-execution-spec

Prepared execution pack: scene/assets/Rooms/checklists/batches/execution/batch_l1_m1_starterrocket1 (manifest + 14 packets + checklist). Added runbook @doc/specs/j6tbdr-chatgpt-execution-runbook and validator script scripts/validate_generated_batch_outputs.mjs.
<!-- SECTION:NOTES:END -->

