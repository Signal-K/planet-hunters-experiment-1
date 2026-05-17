---
id: wgwumr
title: 'Mining tutorial pre-step: show mine zone before firing'
status: done
priority: medium
labels:
  - project-landnam
  - tutorial
  - onboarding
  - ux
createdAt: '2026-03-01T16:16:06.433Z'
updatedAt: '2026-03-01T16:27:17.705Z'
timeSpent: 244
---
# Mining tutorial pre-step: show mine zone before firing

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Testers don't know what mining means before they do it. Add a coach overlay frame before the fire step that highlights the mine zone and gives a one-liner explanation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutorial shows mine zone highlight before player fires for the first time
- [x] #2 Coach message explains what mining does in one sentence
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added m1_mine_intro step (action_key: arrived_at_mining_site) to TutorialCatalog. SidescrollMining._ready() records it via AppControllerHelper. Improved m1_mine message to explain controls and colour coding.
<!-- SECTION:NOTES:END -->

