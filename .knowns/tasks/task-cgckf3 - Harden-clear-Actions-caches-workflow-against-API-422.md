---
id: cgckf3
title: Harden clear Actions caches workflow against API 422
status: in-progress
priority: high
labels:
  - ci
  - github-actions
  - cache
createdAt: '2026-02-13T06:48:19.357Z'
updatedAt: '2026-02-13T06:48:24.602Z'
timeSpent: 0
assignee: '@me'
---
# Harden clear Actions caches workflow against API 422

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cache cleanup workflow fails the run when the GitHub cache API returns 422; handle non-fatal API responses gracefully and keep cleanup best-effort.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Workflow does not fail when cache list API returns 422
- [ ] #2 Workflow still deletes caches when API is healthy
- [ ] #3 Workflow logs API response details for troubleshooting
<!-- AC:END -->

