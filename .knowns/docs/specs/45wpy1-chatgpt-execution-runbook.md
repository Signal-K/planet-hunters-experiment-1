---
title: 45WPY1 ChatGPT Execution Runbook
createdAt: '2026-03-10T07:17:54.162Z'
updatedAt: '2026-03-10T07:18:50.399Z'
description: Step-by-step human execution runbook for advanced R&D batch
---
# 45WPY1 ChatGPT Execution Runbook

## Scope
Executes `task-45wpy1` for:
- `batch_advanced_rnd_t3_and_future`

## Source Artifacts
- `scene/assets/Rooms/checklists/batches/execution/batch_advanced_rnd_t3_and_future/`
- Base spec: `@doc/specs/chatgpt-room-asset-generation-execution-spec`

## Output Destination
- `scene/assets/Rooms/generated/batch_advanced_rnd_t3_and_future/`

## Special Guidance
This batch targets advanced/future rooms not always in current layouts.
- Keep assets production-ready but modular for future unlocks.
- Avoid over-indexing visual complexity; readability-first remains mandatory.
- Preserve compatibility with subtle wear and contractor theming systems.

## Operator Steps
1. Execute packets in order.
2. Keep one dedicated ChatGPT thread for this batch.
3. Save strict `<asset_id>.png` and `<asset_id>.json` files.
4. Track completion in `execution_checklist.csv`.

## Validation Command
```bash
node scripts/validate_generated_batch_outputs.mjs batch_advanced_rnd_t3_and_future scene/assets/Rooms/generated/batch_advanced_rnd_t3_and_future
```

## Completion Gate (45WPY1 AC)
- AC1: advanced batch generated -> validator passes
- AC2: future unlock linkage documented -> task note maps generated rooms to intended unlock stages
