---
id: 7v3blp
title: Gate test_mining.tscn debug scene behind editor-only flag
status: done
priority: high
labels:
  - project-landnam,godot,bug,security
createdAt: '2026-05-14T10:29:32.340Z'
updatedAt: '2026-05-14T10:37:02.700Z'
timeSpent: 0
---
# Gate test_mining.tscn debug scene behind editor-only flag

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
trigger_instant_mining() in AppController.gd:210-214 loads res://test_mining.tscn and is accessible from GameNavigationMenu in production builds. This exposes a raw debug scene to all players on all platforms.

Fix: wrap the menu button in GameNavigationMenu.gd:372-373 behind OS.has_feature("editor") so it never appears in exported builds.

Ref: landnam/audit/megadoc-2026-05-14 CRITICAL-04
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 test_mining.tscn menu entry is not visible in non-editor (exported) builds
- [ ] #2 trigger_instant_mining() still works when running from Godot editor
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done: GameNavigationMenu.gd:216 — debug section (including InstantMining button) now only added when OS.has_feature("editor"). In non-editor builds, debug_label and debug_host are hidden. test_mining.tscn no longer reachable from production menu.
<!-- SECTION:NOTES:END -->

