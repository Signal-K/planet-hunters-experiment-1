---
id: os17dx
title: Science contribution card in mission debrief
status: done
priority: high
labels:
  - citizen-science
  - debrief
  - ux
  - experiment1
createdAt: '2026-02-28T09:48:01.604Z'
updatedAt: '2026-02-28T10:00:30.127Z'
timeSpent: 347
---
# Science contribution card in mission debrief

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After a mission is resolved (sell/scrap/salvage), show a highlighted 'Scientific Observation' card that closes the citizen science loop. Currently the debrief shows minerals and francs but nothing connects it to real science. Users need to feel that their mission contributed to something real.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A styled card appears in the debrief showing: target name, dataset (TESS / Active Asteroids), observation type
- [x] #2 Card text: 'You contributed observation data on [Target]. This data supports the Planet Hunters citizen science network.'
- [x] #3 Card is visually distinct (accent color) from the mineral/economy section
- [ ] #4 Shown after mission is resolved, persists on screen
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Science card built programmatically, inserted before Footer in VBox. Shows target, dataset (TESS/Active Asteroids by type), and citizen science message. Triggered by all 5 resolution paths.
<!-- SECTION:NOTES:END -->

