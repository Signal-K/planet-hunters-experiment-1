---
id: mfrzag
title: Resolve duplicate Knowns task IDs causing status divergence
status: done
priority: high
labels:
  - knowns
  - tooling
  - data-integrity
createdAt: '2026-03-07T01:19:22.080Z'
updatedAt: '2026-03-07T01:32:12.658Z'
timeSpent: 75
assignee: '@me'
---
# Resolve duplicate Knowns task IDs causing status divergence

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Knowns currently has duplicate files for task ID p9x3kw, causing list/status output to conflict (todo + done). Add a deterministic cleanup process so duplicate ID files are merged or archived safely.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Duplicate task files with same ID are identified and reduced to a single canonical record
- [x] #2 knowns task list and knowns task <id> return consistent status for cleaned IDs
- [x] #3 Cleanup steps are documented in a spec/dev note for future maintenance
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add deterministic duplicate-task scanner/cleanup script for .knowns/tasks
2. Run cleanup in report mode, then apply for current duplicates
3. Verify knowns task list/view consistency for cleaned IDs
4. Document cleanup procedure and close task
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added scripts/knowns/dedupe_tasks.mjs for deterministic duplicate-ID detection and archival. Ran dry-run and --apply; archived 6 duplicate task files to .knowns/duplicates/tasks/<timestamp>. Verified no duplicates remain and list/view status is now consistent (e.g., p9x3kw done-only).
<!-- SECTION:NOTES:END -->

