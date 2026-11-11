---
type: decision
title: One sky map, the dark Control Station map
project: Landnam
status: decided
created: 2026-11-11
---

# One sky map, the dark Control Station map (2026-11-11)

Decided by Liam, looking at the pointing scene beside the Control Station on his iPad.

## Decision

- There is one base sky map, and every sky view is built on it. It is the dark Control Station map: near-black navy, a faint cyan grid, a soft Milky Way and round cream/warm stars.
- The light indigo pixel sky is gone. It was hard to navigate and showed no progress.
- A sky view must let the player find their way and see their progress: mapped fields are lit, and the whole sky is shown at a glance.

## In code

- Web: `web/components/game/sky/SkyMapBase.tsx` (and its CSS module). The Control Station scope and the pointing scene both use it; chart marks use its `chart*` classes.
- iOS: `native/App/Screens/SkyMapBase.swift`, drawn by the Control Station scope.
- A new sky view starts from SkyMapBase, not from its own background (SSL-830).
