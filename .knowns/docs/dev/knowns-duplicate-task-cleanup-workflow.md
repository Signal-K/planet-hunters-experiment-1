---
title: Knowns duplicate task cleanup workflow
createdAt: '2026-03-07T01:32:05.447Z'
updatedAt: '2026-03-07T01:32:05.627Z'
description: Operational process for detecting and archiving duplicate task-ID files
tags:
  - knowns
  - maintenance
  - data-integrity
---
# Knowns Duplicate Task Cleanup Workflow

## Problem
Duplicate task markdown files with the same frontmatter `id` in `.knowns/tasks` cause inconsistent status output (e.g., same task shown as both `todo` and `done`).

## Script
Use: `node scripts/knowns/dedupe_tasks.mjs`

### Modes
- Dry run (report only):
  - `node scripts/knowns/dedupe_tasks.mjs`
- Apply cleanup (archive duplicates):
  - `node scripts/knowns/dedupe_tasks.mjs --apply`

## Canonical Selection Rule
For each duplicated `id`, keep exactly one canonical file by deterministic sort:
1. newest `updatedAt`
2. newest file mtime
3. filename lexicographic tie-break

All other copies are moved to `.knowns/duplicates/tasks/<timestamp>/`.

## Verification
After apply:
1. Re-run dry run; expected output: `No duplicate task IDs found.`
2. Check task list consistency:
   - `knowns task list --status todo --plain`
   - `knowns task list --status in-review --plain`
   - `knowns task <id> --plain`

## Notes
- This workflow archives duplicates instead of deleting them so the old files remain recoverable.
- Run this cleanup before backlog grooming and release prep.
