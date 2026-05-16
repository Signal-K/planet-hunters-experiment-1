---
id: vzpwke
title: Scrap and redesign tutorial system from scratch
status: todo
priority: high
labels:
  - project-landnam,godot,tutorial,ux,architecture
createdAt: '2026-05-14T10:36:38.374Z'
updatedAt: '2026-05-14T10:36:38.374Z'
timeSpent: 0
---
# Scrap and redesign tutorial system from scratch

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The existing tutorial system (TutorialController, TutorialPersistence, TutorialCoachOverlay) needs to be fully replaced based on the new user/game flow. Task-5w8lx7 was incorrectly marked done — the system is fully active in code.

New tutorial should reflect the v1 M1-M3 arc and whatever coaching approach fits the new flow. Requires design input before implementation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Old TutorialController, TutorialPersistence, TutorialCatalog, TutorialCoachOverlay removed or archived
- [ ] #2 New tutorial flow spec documented before implementation begins
- [ ] #3 AppController tutorial management wiring (lines 83-113, 728-785) cleaned up
<!-- AC:END -->

