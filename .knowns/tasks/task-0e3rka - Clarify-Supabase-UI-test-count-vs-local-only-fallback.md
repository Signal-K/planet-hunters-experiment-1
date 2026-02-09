---
id: 0e3rka
title: Clarify Supabase UI test count vs local-only fallback
status: done
priority: high
labels:
  - tests
  - supabase
  - ui
createdAt: '2026-02-09T01:57:04.609Z'
updatedAt: '2026-02-09T01:57:28.335Z'
timeSpent: 8
assignee: '@me'
---
# Clarify Supabase UI test count vs local-only fallback

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SupabaseTestRunner UI test could log 1 asteroid due to forced local-only mode even when network fetch returned 5, causing confusion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 UI test uses remote data when fetch succeeds
- [x] #2 Logs clearly indicate when local-only fallback is active
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect SupabaseTestRunner mode flags
2. Switch UI test to remote mode when network fetch succeeds
3. Add explicit fallback log for local-only mode
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Updated SupabaseTestRunner: UI test no longer forces local-only when fetch test succeeded; logs fallback explicitly. Re-ran res://tests/SupabaseTestRunner.gd: 5 fetched + 5 displayed.
<!-- SECTION:NOTES:END -->

