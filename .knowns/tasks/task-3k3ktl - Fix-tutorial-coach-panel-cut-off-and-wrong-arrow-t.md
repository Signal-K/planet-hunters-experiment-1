---
id: 3k3ktl
title: Fix tutorial coach panel cut-off and wrong arrow target in prod
status: done
priority: high
labels:
  - bug
  - tutorial
  - ui
createdAt: '2026-05-24T15:18:53.232Z'
updatedAt: '2026-05-24T15:18:53.232Z'
timeSpent: 0
---
# Fix tutorial coach panel cut-off and wrong arrow target in prod

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tutorial panel was overflowing the right edge of the game viewport in production because the title label's natural text width forced PanelContainer wider than the UILayout zone (320px). Zone was also too short (240px) to fit all content. Arrow for the open_launchpad step pointed at the physical Launchpad building instead of the New Mission nav button.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

