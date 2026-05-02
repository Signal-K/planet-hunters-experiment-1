---
title: KGU42S ChatGPT Execution Runbook
createdAt: '2026-03-10T07:17:51.955Z'
updatedAt: '2026-03-10T07:18:38.896Z'
description: Step-by-step human execution runbook for usage state variants batch
---
# KGU42S ChatGPT Execution Runbook

## Scope
Executes `task-kgu42s` for:
- `batch_usage_state_variants_all_rooms`

## Source Artifacts
- `scene/assets/Rooms/checklists/batches/execution/batch_usage_state_variants_all_rooms/`
- Base spec: `@doc/specs/chatgpt-room-asset-generation-execution-spec`

## Output Destination
- `scene/assets/Rooms/generated/batch_usage_state_variants_all_rooms/`

## Critical QA Focus
This batch is state progression heavy. Enforce:
- monotonic wear progression (clean -> used -> worn)
- state naming alignment with runtime keys
- no silhouette loss from wear/theming overlays

## Operator Steps
1. Run packets sequentially in one thread.
2. Generate one asset per prompt row.
3. Save strict filenames by `asset_id`.
4. Maintain `execution_checklist.csv` completion + QA flags.

## Validation Command
```bash
node scripts/validate_generated_batch_outputs.mjs batch_usage_state_variants_all_rooms scene/assets/Rooms/generated/batch_usage_state_variants_all_rooms
```

## Completion Gate (KGU42S AC)
- AC1: all `usage_*` assets generated -> validator passes
- AC2: state naming matches runtime -> no sidecar/schema naming mismatches
- AC3: monotonic wear confirmed -> QA note lists spot-checks and corrections
