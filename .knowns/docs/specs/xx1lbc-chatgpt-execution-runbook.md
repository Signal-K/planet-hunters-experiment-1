---
title: XX1LBC ChatGPT Execution Runbook
createdAt: '2026-03-10T07:17:49.745Z'
updatedAt: '2026-03-10T07:18:27.593Z'
description: Step-by-step human execution runbook for L3 M4 + Free Ops batches
---
# XX1LBC ChatGPT Execution Runbook

## Scope
Executes `task-xx1lbc` using the respecified L3 batches:
- `batch_l3_m4_starterrocket3`
- `batch_l3_free_ops_starterrocket3`

## Source Artifacts
- `scene/assets/Rooms/checklists/batches/execution/batch_l3_m4_starterrocket3/`
- `scene/assets/Rooms/checklists/batches/execution/batch_l3_free_ops_starterrocket3/`
- Base spec: `@doc/specs/chatgpt-room-asset-generation-execution-spec`

## Output Destinations
- `scene/assets/Rooms/generated/batch_l3_m4_starterrocket3/`
- `scene/assets/Rooms/generated/batch_l3_free_ops_starterrocket3/`

## Execution Order
1. Execute all packet files for M4 batch.
2. Validate M4 outputs.
3. Execute all packet files for Free Ops batch.
4. Validate Free Ops outputs.
5. Record small-scale readability QA findings.

## Required Rules
- Keep line weight, palette, and silhouette readability consistent.
- For Free Ops, preserve modular room look and avoid visual clutter.
- No labels/text/UI baked into sprites.

## Validation Commands
```bash
node scripts/validate_generated_batch_outputs.mjs batch_l3_m4_starterrocket3 scene/assets/Rooms/generated/batch_l3_m4_starterrocket3
node scripts/validate_generated_batch_outputs.mjs batch_l3_free_ops_starterrocket3 scene/assets/Rooms/generated/batch_l3_free_ops_starterrocket3
```

## Completion Gate (XX1LBC AC)
- AC1: M4 batch generated/exported -> validator passes for M4 folder
- AC2: Free Ops batch generated/exported -> validator passes for Free Ops folder
- AC3: Late-loop readability validated -> QA note includes readability pass/fail and fixed items
