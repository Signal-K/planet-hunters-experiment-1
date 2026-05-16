---
id: kcckns
title: Expand contractor selection panel to full/wide layout
status: done
priority: medium
labels:
  - project-landnam
  - ux
  - layout
  - contractor
createdAt: '2026-03-21T01:38:41.921Z'
updatedAt: '2026-03-21T01:43:12.991Z'
timeSpent: 0
---
# Expand contractor selection panel to full/wide layout

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The contractor selection panel is currently a narrow sidebar (~42% viewport width). When in contractor-selection flow phase, expand it to a wider area (~72%) so there is room to display the additional contractor detail info.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When flow_phase == 'contractor', panel uses ~72% viewport width instead of 42%
- [x] #2 Contractor section content_min_size is increased to show all card detail without scrolling
- [x] #3 Panel returns to normal sidebar width for rocket/target phases
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Restructured populate_targets to compute flow_phase before calling _set_selector_panel_layout. Layout now accepts flow_phase param; contractor phase uses 68% width (vs 42%), min 520px, max 860px, and 84% height.
<!-- SECTION:NOTES:END -->

