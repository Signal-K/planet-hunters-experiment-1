---
id: bwuozl
title: 'P6: Docker + Playwright visual screenshot harness'
status: todo
priority: high
labels:
  - portrait-mode
  - testing
  - docker
  - playwright
  - sprint-active
createdAt: '2026-05-25T09:17:34.982Z'
updatedAt: '2026-05-25T09:25:04.468Z'
timeSpent: 0
parent: fmq4vk
---
# P6: Docker + Playwright visual screenshot harness

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up a visual test environment that actually interacts with a rendered UI, replacing the current headless Godot approach that can't verify layout.

docker-compose.visual.yml:
- Service 1: portrait-web — node dev-server.js serving the portrait/ design reference at port 3333
- Service 2: playwright — mcr.microsoft.com/playwright image running tests/visual/*.spec.ts

Tests navigate the React prototype (portrait/index.html) through every screen in the game loop, take screenshots, and diff against baselines. This validates the design spec is correct before/during the Godot scene work.

Longer term: once Godot web export is served, replace the portrait HTML target with the real Godot game at /game.

New Makefile target: make test:visual
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

