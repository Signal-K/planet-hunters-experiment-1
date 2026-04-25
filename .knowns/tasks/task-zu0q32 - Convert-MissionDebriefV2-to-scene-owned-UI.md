---
id: zu0q32
title: Convert MissionDebriefV2 to scene-owned UI
status: done
priority: high
labels:
  - ui
  - debrief
  - missions
  - scene-owned
createdAt: '2026-04-24T06:51:40.025Z'
updatedAt: '2026-04-24T06:55:35.293Z'
timeSpent: 0
assignee: '@me'
---
# Convert MissionDebriefV2 to scene-owned UI

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move MissionDebriefV2 layout out of GDScript-built controls and into .tscn scene/template files so the debrief surface is editable in Godot and follows the scene-owned UI rule.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 MissionDebriefV2 primary layout sections live in .tscn scene/template files
- [ ] #2 MissionDebriefV2.gd binds data into scene-owned nodes instead of constructing those sections in code
- [ ] #3 Debrief tests cover the converted scene-owned layout path
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect MissionDebriefV2 scene and identify the highest-volume script-built sections.
2. Move the primary debrief shell and persistent layout sections into mission_debrief_v2.tscn/templates.
3. Update MissionDebriefV2.gd to bind data into scene-owned nodes instead of constructing those sections.
4. Add or update debrief tests for the scene-owned layout path.
5. Verify with focused debrief and structure suites.
<!-- SECTION:PLAN:END -->

