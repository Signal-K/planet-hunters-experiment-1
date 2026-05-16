---
id: zxpvox
title: Clean stale knowns tasks and legacy backup/example assets
status: done
priority: medium
labels:
  - project-landnam
  - cleanup
  - knowns
  - assets
createdAt: '2026-02-26T01:52:31.073Z'
updatedAt: '2026-02-26T02:03:02.021Z'
timeSpent: 85
assignee: '@me'
parent: blav3e
---
# Clean stale knowns tasks and legacy backup/example assets

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve duplicate/orphan task entries and remove or document legacy backup/example files that are no longer production paths.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Duplicate/orphan knowns tasks are reconciled with canonical tasks
- [x] #2 Legacy backup/example files are removed or explicitly documented
- [x] #3 Cleanup avoids deleting active assets still referenced by runtime
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Removed scene/Scenes/UI/SidescrollMining.tscn.backup (stale legacy backup).

✓ Marked duplicate UI cleanup tasks (43ckab, hnyx78) as done and superseded by canonical tasks.

✓ Kept earth_base_example.* intentionally (referenced as sample/template in Earth scene docs).
<!-- SECTION:NOTES:END -->

