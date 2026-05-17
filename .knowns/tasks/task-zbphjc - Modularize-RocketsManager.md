---
id: zbphjc
title: Modularize RocketsManager
status: in-progress
priority: medium
labels:
  - project-landnam
  - godot
  - architecture
  - rockets
  - missions
createdAt: '2026-05-14T00:32:31.001Z'
updatedAt: '2026-05-14T00:48:21.903Z'
timeSpent: 0
parent: r2shk5
order: 3
---
# Modularize RocketsManager

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Related to: #tbt6nd

All rockets should be composed of a combination of three parts (later-game rockets will have more groups, but for now it's booster, main stage, second stage).

Rocket manager should keep track of what users build for their new missions, and keep a log of all rockets from old missions too. Three parts.

Use a modern & scalable save/state manager
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Logic separated from data
<!-- AC:END -->

