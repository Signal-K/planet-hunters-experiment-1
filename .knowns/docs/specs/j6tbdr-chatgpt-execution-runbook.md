---
title: J6TBDR ChatGPT Execution Runbook
createdAt: '2026-03-10T07:13:54.065Z'
updatedAt: '2026-03-10T07:15:18.661Z'
description: Step-by-step human execution runbook for batch_l1_m1_starterrocket1
---
# J6TBDR ChatGPT Execution Runbook

## Scope
This runbook executes `task-j6tbdr` only:
- Batch: `batch_l1_m1_starterrocket1`
- Asset count: 165
- Packetization: 14 packets (12 assets each, last packet partial)

## Source Artifacts
Execution pack location:
- `scene/assets/Rooms/checklists/batches/execution/batch_l1_m1_starterrocket1/manifest.json`
- `scene/assets/Rooms/checklists/batches/execution/batch_l1_m1_starterrocket1/packet_01.json` ... `packet_14.json`
- `scene/assets/Rooms/checklists/batches/execution/batch_l1_m1_starterrocket1/execution_checklist.csv`

Base spec (must-follow):
- `@doc/specs/chatgpt-room-asset-generation-execution-spec`

## Output Destination
Write generated outputs to:
- `scene/assets/Rooms/generated/batch_l1_m1_starterrocket1/`

Per asset, required files:
- `<asset_id>.png`
- `<asset_id>.json`
Optional:
- `<asset_id>.txt`

## Session Setup (Human Operator)
1. Open one ChatGPT thread for this batch only.
2. Attach style anchor reference image(s) once at start.
3. Paste this thread preamble exactly:

```
You are executing a fixed production asset batch.
Obey strict filename contract and output schema.
No creative renaming, no extra suffixes, no skipped assets.
One asset output per request, matching supplied asset_id exactly.
```

## Packet Execution Loop
For packet `N` from 1 to 14:
1. Open `packet_NN.json`.
2. For each `assets[]` entry, send one prompt request to ChatGPT using:
   - `asset_id`
   - `prompt`
   - required constraints from execution spec
3. Save files immediately:
   - image as `<asset_id>.png`
   - sidecar as `<asset_id>.json`
4. Update `execution_checklist.csv` row:
   - `status=done`
   - `image_file`, `json_file` confirmed
   - `qa_pass=yes/no`
   - short `notes`

## Prompt Envelope (Copy/Paste Per Asset)
```
Generate one production asset with strict contract.

asset_id: <asset_id>
asset_type: <asset_type>
room_id: <room_id>
room_name: <room_name>
category: <category>
tier: <tier>
component_id: <component_id>
component_name: <component_name>
component_kind: <component_kind>
state_key: <state_key>
priority: <priority>

Prompt body:
<prompt>

Hard constraints:
- Keep interactable silhouette readable at small scale
- No text, labels, UI, or characters
- Preserve style-anchor line weight and color temperature
- Subtle wear only; readability first
- Output this exact filename: <asset_id>.png
- Output sidecar JSON as <asset_id>.json using required schema
```

## QA Gate (Per Packet)
Do not proceed to next packet until all checks pass:
- [ ] Every asset in packet has PNG + JSON
- [ ] File names exactly match `asset_id`
- [ ] No overlap-prone clutter at edges
- [ ] State variants are monotonic (`idle/active/cooldown/damaged/depleted`)
- [ ] No accidental perspective/style drift

If any fail, re-run only failed assets before advancing.

## Batch Completion Gate (Task AC Mapping)
AC #1: all prompts generated
- `execution_checklist.csv` has `status=done` for all 165 assets

AC #2: stable naming by `asset_id`
- directory audit confirms every output matches `<asset_id>.*`

AC #3: quick visual QA logged
- add one summary note section to task with:
  - total generated
  - total regenerated
  - key issues found/fixed

## Final Hand-off Steps
1. Zip outputs: `batch_l1_m1_starterrocket1_outputs.zip`
2. Store next to output directory.
3. Update Knowns task `j6tbdr` notes with completion summary and QA findings.
4. Move task from `blocked` to `done` once AC are checked.

## Operator Notes
- Keep this thread exclusive to `batch_l1_m1_starterrocket1`.
- If the model output schema drifts, stop and restart from the failing asset with the prompt envelope above.
- Do not mix packets across different batches.



## Automated Validation Command
After generation, run:

```bash
node scripts/validate_generated_batch_outputs.mjs batch_l1_m1_starterrocket1 scene/assets/Rooms/generated/batch_l1_m1_starterrocket1
```

Pass condition:
- command exits success and reports all assets verified

Fail condition:
- missing PNG/JSON
- filename mismatch
- sidecar schema mismatch
- unexpected extra files not in batch list



Reference note: use spec path `specs/chatgpt-room-asset-generation-execution-spec` (Knowns doc id: `@doc/specs/chatgpt-room-asset-generation-execution-spec`).
