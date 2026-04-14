---
id: h5xn2s
title: Fix spec/doc source-of-truth drift and broken references
status: done
priority: high
labels:
  - docs
  - spec
  - consistency
createdAt: '2026-02-26T01:52:06.116Z'
updatedAt: '2026-02-26T01:54:19.486Z'
timeSpent: 75
assignee: '@me'
parent: blav3e
---
# Fix spec/doc source-of-truth drift and broken references

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update knowns specs/docs so mission economics, code references, and task links are accurate and non-contradictory.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission cost/reward values in specs match current code and corrections sections
- [x] #2 Broken task refs are resolved or replaced with maintained references
- [x] #3 Spec index and coverage matrix no longer report broken refs for active mappings
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Updated spec docs via `knowns doc edit` to remove broken `@task-*` references while preserving historical IDs as plain text.
- Corrected mission economy drift in both mission spec copies (M1/M2 cost and expected return values, rocket cost table rows).
- Replaced stale tutorial script references to `TutorialCoachOverlay.gd` and updated coverage matrix wording.
- Updated specifications index and coverage matrix to avoid unresolved task-link metadata drift.
<!-- SECTION:NOTES:END -->

