---
id: u5tpj6
title: >-
  Fix intro splash script API mismatch causing AppController compile/runtime
  errors
status: done
priority: high
labels:
  - runtime
  - startup
  - bug
createdAt: '2026-03-10T05:43:34.158Z'
updatedAt: '2026-03-10T05:52:46.446Z'
timeSpent: 11
assignee: '@me'
---
# Fix intro splash script API mismatch causing AppController compile/runtime errors

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Headless audit reports PlanetHuntersIntroSplash identifier/has_been_shown mismatch in AppController startup path. Restore valid preload/API contract so AppController loads cleanly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AppController no longer reports PlanetHuntersIntroSplash compile error
- [x] #2 No invalid call to has_been_shown during startup
- [x] #3 Relevant tutorial/startup tests pass without splash-related script errors
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Repaired intro splash startup contract by fixing splash dismissal call and AppController splash-shown check path.
- Verified no has_been_shown invalid-call errors during headless startup test runs.
- Mission and narrative suites now compile/load cleanly through startup.
<!-- SECTION:NOTES:END -->

