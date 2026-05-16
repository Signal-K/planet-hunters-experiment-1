---
id: gk4g2k
title: Significant launchpad UI redesign
status: done
priority: high
labels:
  - project-landnam
  - launchpad
  - ui
  - ux
  - rockets
createdAt: '2026-02-16T14:59:32.780Z'
updatedAt: '2026-02-16T15:07:26.110Z'
timeSpent: 361
assignee: '@me'
---
# Significant launchpad UI redesign

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Overhaul launchpad rocket selection UI to improve hierarchy, readability, card design, spacing, and visual polish while keeping existing functionality.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Launchpad selector has clear visual hierarchy and is readable on desktop/mobile
- [x] #2 Rocket cards present stats and actions in a polished, consistent layout
- [x] #3 Primary actions (create/back) are visually distinct and accessible
- [x] #4 Existing launchpad behavior remains functional (rocket creation, dragging, back)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Restructure launchpad selector composition to remove nested/overlapping panels and create a single cohesive layout container.
2. Redesign rocket cards with stronger hierarchy: hero image, title, grouped stats chips, clear pricing row, and prominent Create CTA.
3. Apply polished visual system (contrast, spacing, borders/shadows, typography sizing) and make panel responsive for smaller viewports.
4. Keep existing behavior (create/drag/back/target select) intact and run launchpad-related test scripts.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Refactored `RocketSelector` to be container-driven (removed hardcoded in-container positioning) to eliminate panel overlap/crowding.
- Rebuilt selector UI with a polished card-based layout: strong header, guidance subtitle, scrollable responsive grid, richer rocket cards, grouped stat chips, clear economy row, and prominent primary CTA.
- Styled launchpad selector/targets section for readability with improved panel contrast, spacing, card rows, and accessible button styling.
- Kept existing behavior intact (create flow, drag initiation, back navigation, target selection).

## Validation
- `cd /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/scene && /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --script res://tests/run_experience_tests.gd 2>&1`
  - 19/19 passed.

🔄 Reopened: harmonize shell/card styles and increase selector size after UI feedback

✓ Second-pass polish: increased shell footprint, aligned shell/card palette and radius, increased typography scale, and expanded rocket card dimensions to reduce cramped view
<!-- SECTION:NOTES:END -->

