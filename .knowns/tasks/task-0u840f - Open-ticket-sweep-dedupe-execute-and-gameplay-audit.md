---
id: 0u840f
title: 'Open-ticket sweep: dedupe, execute, and gameplay audit'
status: done
priority: high
labels:
  - project-landnam
  - knowns
  - audit
  - execution
  - spec-driven
createdAt: '2026-03-10T05:35:12.458Z'
updatedAt: '2026-03-10T05:59:08.034Z'
timeSpent: 1421
assignee: '@me'
---
# Open-ticket sweep: dedupe, execute, and gameplay audit

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit all open Knowns tickets (todo/in-progress/blocked/in-review), identify duplicates/already-done items, complete actionable work, and run out-of-sandbox Godot headless gameplay audit with spec-driven recommendations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All currently open tickets are classified as done/blocked/duplicate/actionable with notes.
- [x] #2 Duplicate or already-completed tickets are closed with evidence references.
- [x] #3 Remaining actionable engineering tickets are implemented and validated.
- [x] #4 Out-of-sandbox Godot headless audit is executed and findings are mapped to ticket actions/spec updates.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory all open tickets by status and pull AC/details.
2. Run duplicate/completion audit against current code/tests/spec docs and mark done/duplicate/blocked tickets with evidence.
3. Implement remaining actionable tickets in priority order with focused tests.
4. Run Godot headless gameplay audit outside sandbox and map findings to ticket/spec actions.
5. Finalize Knowns statuses/notes and deliver execution summary + next priorities.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Audited all open tickets by status and reclassified to done/blocked with current implementation evidence.
- Closed actionable audit follow-ups: `vgb4xi`, `u5tpj6`, `0cf8ow`.
- Ran out-of-sandbox Godot headless import + suites (`run_mission_e2e_flow_tests.gd`, `run_narrative_paths_tests.gd`, `run_structure_tests.gd`) and validated all pass after fixes.
- Rescoped legacy Mission 5 art batch ticket `xx1lbc` to `M4 + Free Ops` and updated batch generator/output naming.
- Remaining blocked tasks are external image-generation execution and future balancing deferrals (`ci4oe8`, `j6tbdr`, `kgu42s`, `xx1lbc`, `45wpy1`, `lkzqm0`).
<!-- SECTION:NOTES:END -->

