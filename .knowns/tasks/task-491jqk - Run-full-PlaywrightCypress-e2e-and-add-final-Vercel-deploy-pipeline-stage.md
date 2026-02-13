---
id: 491jqk
title: Run full Playwright+Cypress e2e and add final Vercel deploy pipeline stage
status: in-progress
priority: high
labels:
  - e2e
  - playwright
  - cypress
  - vercel
  - ci
  - web
createdAt: '2026-02-13T07:33:37.262Z'
updatedAt: '2026-02-13T07:33:44.591Z'
timeSpent: 0
assignee: '@me'
---
# Run full Playwright+Cypress e2e and add final Vercel deploy pipeline stage

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute full browser e2e suites (Playwright and Cypress) for the web app, then add a Vercel deployment stage that runs at the end of the unified CI pipeline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Playwright e2e suite runs to completion
- [ ] #2 Cypress e2e suite runs to completion
- [ ] #3 CI pipeline includes final Vercel deployment stage after test/release/cache stages
<!-- AC:END -->

