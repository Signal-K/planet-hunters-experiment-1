---
id: yaajdi
title: 'P1: Unlock orientation — app.json + Godot viewport → portrait'
status: todo
priority: high
labels:
  - portrait-mode
  - sprint-active
createdAt: '2026-05-25T09:10:30.774Z'
updatedAt: '2026-05-25T09:25:03.411Z'
timeSpent: 0
parent: fmq4vk
---
# P1: Unlock orientation — app.json + Godot viewport → portrait

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the landscape lock. Two changes:
1. app.json: "orientation": "landscape" → "portrait" (React Native wrapper)
2. scene/project.godot: viewport_width/height swapped to portrait resolution (1080×1920), stretch mode set to "expand", handheld orientation already correct (1=portrait)
3. index.html: remove the landscape media query hack that forces game content sideways

This is the prerequisite for all other portrait scene work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 app.json orientation is portrait
- [ ] #2 Godot project.godot viewport is portrait (1080×1920 or equivalent)
- [ ] #3 index.html no longer forces landscape rotation on mobile
- [ ] #4 Existing Godot tests still pass (make test)
<!-- AC:END -->

