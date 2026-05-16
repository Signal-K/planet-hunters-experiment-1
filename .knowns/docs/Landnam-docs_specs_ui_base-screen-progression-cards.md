---
title: Base screen progression cards
description: Defines Next Mission and Star Map placeholder cards shown on Earth base
createdAt: '2026-03-07T01:29:41.556Z'
updatedAt: '2026-05-13T08:07:56.038Z'
tags:
  - project-landnam
  - doc-kind-spec
  - ui
  - progression
  - earth-base
  - retention
  - spec
---

[← Back to Index](../INDEX.md)

# Base Screen Progression Cards

## Goals
- Provide immediate re-entry CTA after mission debrief.
- Show a lightweight star-map progress signal on Earth base.

## Card Set
1. Next Mission card
  - Visible when at least one mission has been completed.
  - CTA opens launchpad/new mission flow.
2. Star Map placeholder card
  - Always visible on base scene.
  - Shows discovered planet count as `Discovered: X / ???`.
  - CTA opens Space Map scene.

## Data Sources
- `RocketsManager.get_completed_mission_count()` for mission completion gating.
- `RocketsManager.load_state()["seen_planets"]` and detected targets fallback for discovered count.

## Layout
- Cards are runtime-built in Earth base UI layer near top-right, below title/wordmark.
- Keep cards compact and non-blocking for core base interactions.
