---
title: CI4OE8 ChatGPT Execution Runbook
createdAt: '2026-03-10T07:17:47.519Z'
updatedAt: '2026-03-10T07:18:13.710Z'
description: Step-by-step human execution runbook for L2 M2+M3 batches
---
# CI4OE8 ChatGPT Execution Runbook

## Scope
Executes `task-ci4oe8` using two batches:
- `batch_l2_m2_starterrocket2`
- `batch_l2_m3_starterrocket2`

## Source Artifacts
- `scene/assets/Rooms/checklists/batches/execution/batch_l2_m2_starterrocket2/`
- `scene/assets/Rooms/checklists/batches/execution/batch_l2_m3_starterrocket2/`
- Base spec: `@doc/specs/chatgpt-room-asset-generation-execution-spec`

## Output Destinations
- `scene/assets/Rooms/generated/batch_l2_m2_starterrocket2/`
- `scene/assets/Rooms/generated/batch_l2_m3_starterrocket2/`

Required files per asset:
- `<asset_id>.png`
- `<asset_id>.json`

## Execution Order
1. Complete all packets in `batch_l2_m2_starterrocket2`.
2. Run validator.
3. Complete all packets in `batch_l2_m3_starterrocket2`.
4. Run validator.
5. Log quick visual QA findings in task notes.

## Operator Steps
For each packet file `packet_NN.json`:
1. Open one ChatGPT thread dedicated to that batch.
2. Attach style anchor image once.
3. For each `assets[]` row, generate one asset using its prompt.
4. Save with strict filename contract.
5. Update `execution_checklist.csv` status/qa fields.

## Validation Commands
```bash
node scripts/validate_generated_batch_outputs.mjs batch_l2_m2_starterrocket2 scene/assets/Rooms/generated/batch_l2_m2_starterrocket2
node scripts/validate_generated_batch_outputs.mjs batch_l2_m3_starterrocket2 scene/assets/Rooms/generated/batch_l2_m3_starterrocket2
```

## Completion Gate (CI4OE8 AC)
- AC1: M2 batch generated/exported -> validator passes for `batch_l2_m2_starterrocket2`
- AC2: M3 batch generated/exported -> validator passes for `batch_l2_m3_starterrocket2`
- AC3: Inconsistencies flagged -> task note includes QA issue list (even if empty)
