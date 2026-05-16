---
id: ozy55l
title: Build Earth weather engine core (cycle + event API)
status: done
priority: high
labels:
  - project-landnam
  - godot
  - earth
  - weather
  - architecture
createdAt: '2026-02-26T00:59:20.193Z'
updatedAt: '2026-02-26T01:32:25.820Z'
timeSpent: 0
parent: 4uqwke
---
# Build Earth weather engine core (cycle + event API)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a reusable script/component that drives normalized time-of-day, day/night interpolation over 60s, and a plugin-style weather event API for effects.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Engine exposes configurable cycle duration with default 60 seconds
- [ ] #2 Engine emits/updates normalized day-night factor for visuals
- [ ] #3 Engine provides modular hooks to add/remove weather events without scene rewrites
<!-- AC:END -->

