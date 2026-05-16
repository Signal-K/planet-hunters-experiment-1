---
id: s0e57m
title: Add launch-site and ship-range overlays to starmap
status: done
priority: medium
labels:
  - project-landnam
  - star-map
  - launchpad
  - ui
createdAt: '2026-03-26T09:47:46.015Z'
updatedAt: '2026-03-28T04:06:35.423Z'
timeSpent: 0
assignee: '@me'
parent: ls9pkd
---
# Add launch-site and ship-range overlays to starmap

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from @task-kh8gvl notebook reminders. The map should show launch sites in-system and the usable range for each available ship type so target reachability is spatially legible instead of text-only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Launch sites are visible on the map
- [x] #2 Available ship ranges are visualized against the map
- [x] #3 Overlay data stays in sync with rocket specs and selected ship
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
$Ship range overlays added to LaunchpadStarMap.gd.
- setup() now accepts optional rocket_ranges: Array of {name, max_range_au}
- _au_px_scale converts AU to pixels (outermost ring = AU_MAX_VISUAL = 20 AU)
- Dashed range arcs drawn per rocket in blue/amber/green; range labels at top of arc
- LaunchpadSelectorPanel._build_rocket_range_data() passes unlocked rocket specs at call time
- Tests: run_starmap_enhancement_tests.gd (3 s0e57m tests pass)
<!-- SECTION:NOTES:END -->

