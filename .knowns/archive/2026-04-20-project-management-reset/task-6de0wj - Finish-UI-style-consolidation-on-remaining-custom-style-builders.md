---
id: 6de0wj
title: Finish UI style consolidation on remaining custom style builders
status: done
priority: medium
labels:
  - ui
  - theme
  - cleanup
createdAt: '2026-02-26T01:52:31.082Z'
updatedAt: '2026-02-26T02:07:48.435Z'
timeSpent: 268
assignee: '@me'
parent: blav3e
---
# Finish UI style consolidation on remaining custom style builders

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Migrate remaining ad-hoc style code to shared PanelStyle/Nebula primitives and keep opt-outs explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Remaining custom style hotspots are migrated or intentionally locked
- [x] #2 No regressions in panel/button readability and contrast
- [x] #3 Shared styling usage is documented for future features
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Consolidated script hotspots to PanelStyle tokens/factories (SubcontractorsPanel, NewMissionAnnotations, AsteroidImageHelper, MenuPanel).

✓ Added explicit intentional opt-out comment for TutorialCoachOverlay highlight style.

✓ Documented shared style usage in @doc/dev/nebula-theme-implementation.

Note: verification is static/code-level only in this pass (no Godot visual runtime executed).
<!-- SECTION:NOTES:END -->

