---
id: nsr4af
title: 'Improve PWA load performance: faster shell caching and no cache-busting'
status: done
priority: high
labels:
  - project-landnam
  - pwa,performance,mobile
createdAt: '2026-03-23T00:48:56.769Z'
updatedAt: '2026-03-23T00:51:05.784Z'
timeSpent: 0
assignee: '@Liam'
---
# Improve PWA load performance: faster shell caching and no cache-busting

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PWA should load near-instantly when installed. Issues: 1) Shell uses network-first (slow offline), 2) gameSrc uses Date.now() cache-busting which prevents SW from caching game, 3) SW version needs bump for new strategies
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shell assets use stale-while-revalidate caching strategy
- [x] #2 gameSrc in PWA mode does not include Date.now() cache-buster
- [x] #3 SW version bumped and pre-caches game index.html
- [x] #4 Service worker registers immediately (not waiting for load event)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SW v4: stale-while-revalidate for shell (instant loads), cache-first for game assets, pre-caches game/index.html. gameSrc no longer cache-busts in PWA mode. SW registers immediately on page load.
<!-- SECTION:NOTES:END -->

