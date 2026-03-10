---
id: qyx07e
title: Add Free Ops target refresh with discovery opportunity every run
status: done
priority: high
labels:
  - gameplay
  - free-ops
  - targets
  - missions
createdAt: '2026-03-10T06:14:46.145Z'
updatedAt: '2026-03-10T06:54:05.445Z'
timeSpent: 886
assignee: '@me'
---
# Add Free Ops target refresh with discovery opportunity every run

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure each post-M4 run offers candidate classification opportunities and refreshes mission/target variety without guaranteeing candidate truth and without forcing authored rail progression.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Known + candidate target mix remains available per run
- [x] #2 System supports adding new mission/target templates over time
- [x] #3 Every Free Ops run offers at least one unconfirmed candidate option (not guaranteed true transit)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace scanner refresh and detected target generation paths.
2. Ensure each run refresh provides at least one unconfirmed candidate option (without guaranteeing truth).
3. Verify scanner-only sourcing and close task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added scanner persistence enrichment for Free Ops planet scans so each refresh includes candidate + known target options when needed.
- Candidate outcome remains unconfirmed-first (no forced truth), aligned to scanner-driven discovery loop.
- Kept target pipeline template-friendly (existing stage/target selection APIs unchanged, additive enrichment only).

## Verification
- Mission E2E, Narrative, and Structure test suites pass after change.
<!-- SECTION:NOTES:END -->

