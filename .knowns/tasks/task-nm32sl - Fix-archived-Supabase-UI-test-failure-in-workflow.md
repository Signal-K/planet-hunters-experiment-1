---
id: nm32sl
title: Fix archived Supabase UI test failure in workflow
status: in-review
priority: high
labels:
  - ci
  - tests
  - supabase
createdAt: '2026-02-02T03:21:35.261Z'
updatedAt: '2026-02-04T04:14:29.115Z'
timeSpent: 4994
assignee: '@me'
---
# Fix archived Supabase UI test failure in workflow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Workflow run on main fails: archived Supabase UI test can't create AsteroidDetailView after click (see CI output). Investigate and fix root cause so archived UI test passes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Archived Supabase UI test passes in workflow
- [ ] #2 No new warnings/regressions introduced in archived UI flow
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Locate archived test + UI paths and reproduce failure conditions from logs.
2. Inspect relevant scene/scripts to see why AsteroidDetailView not created after click.
3. Implement minimal fix to restore archived UI behavior and keep warnings in check.
4. Run targeted test (or minimal local verification) and update notes/AC.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added archived detail override flag and use archived detail view in test runner
<!-- SECTION:NOTES:END -->

