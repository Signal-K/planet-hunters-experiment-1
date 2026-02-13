---
id: nm32sl
title: Fix archived Supabase UI test failure in workflow
status: done
priority: high
labels:
  - ci
  - tests
  - supabase
createdAt: '2026-02-02T03:21:35.261Z'
updatedAt: '2026-02-08T02:54:24.234Z'
timeSpent: 5279
assignee: '@me'
---
# Fix archived Supabase UI test failure in workflow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Workflow run on main fails: archived Supabase UI test can't create AsteroidDetailView after click (see CI output). Investigate and fix root cause so archived UI test passes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Archived Supabase UI test passes in workflow
- [x] #2 No new warnings/regressions introduced in archived UI flow
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

⚠️ Reopened: done ticket had unchecked AC and run_supabase_tests.gd currently fails parse at line 31 (uses  instead of ).

Clarification: parse failure is in scene/tests/run_supabase_tests.gd line 31, where variable name should reference _client not client.

✓ Fixed run_supabase_tests parse error and made Supabase headless/UI runners deterministic under network-restricted headless runs (local-only panel mode).

Validation: tests/run_supabase_tests.gd PASS; tests/SupabaseTestRunner.gd PASS (4/4).
<!-- SECTION:NOTES:END -->

