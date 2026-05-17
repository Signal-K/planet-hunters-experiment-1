---
id: cgckf3
title: Harden clear Actions caches workflow against API 422
status: done
priority: high
labels:
  - project-landnam
  - ci
  - github-actions
  - cache
createdAt: '2026-02-13T06:48:19.357Z'
updatedAt: '2026-02-13T07:31:43.905Z'
timeSpent: 2580
assignee: '@me'
---
# Harden clear Actions caches workflow against API 422

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cache cleanup workflow fails the run when the GitHub cache API returns 422; handle non-fatal API responses gracefully and keep cleanup best-effort.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Workflow does not fail when cache list API returns 422
- [x] #2 Workflow still deletes caches when API is healthy
- [x] #3 Workflow logs API response details for troubleshooting
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Workflow now handles 422 non-fatally, logs list/delete HTTP responses, and still deletes caches on 200/204.
<!-- SECTION:NOTES:END -->

