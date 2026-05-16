---
id: i7qewb
title: Purge Scanner/Satellite Station from active codebase (deferred feature)
status: todo
priority: medium
labels:
  - project-landnam,godot,cleanup,scanner,deferred
createdAt: '2026-05-14T10:31:52.398Z'
updatedAt: '2026-05-14T10:31:52.398Z'
timeSpent: 0
---
# Purge Scanner/Satellite Station from active codebase (deferred feature)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision: Scanner will not be in the first release. Full spec and code inventory preserved in @doc/landnam/structures/scanner-station-deferred-feature-spec.

Remove or stub all scanner-related code, UI, and state from the active codebase so it doesn't show up to players or create confusion. Do NOT delete script files — archive them so the feature can be reintroduced cleanly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No scanner UI appears to players in exported builds
- [ ] #2 Scanner state fields removed from PlayerProfile and AppController snapshots
- [ ] #3 Scanner constants and methods stubbed or removed from RocketsManager.gd
- [ ] #4 SatelliteStation*.gd scripts and SatelliteStationPanel.tscn archived (not deleted)
- [ ] #5 Economy doc and Mission System Specification scanner references updated/removed
<!-- AC:END -->

