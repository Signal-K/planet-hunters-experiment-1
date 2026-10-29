---
type: decision
title: Instruments are controls you look through
project: Landnam
status: decided
created: 2026-10-29
---

# Instruments are controls you look through (2026-10-29)

Decided by Liam on the meteor radio scene (SSL-714).

## Decision

- When a scene shows data from an instrument, the player looks at it through that instrument:
  a console window with a title bar and station details, framed by physical controls (dials,
  switches) that really change the view.
- A person on the other end (a radio desk, a control room) briefs the player in short
  dialogue lines the first time, and reacts to what they do.
- Controls must work by touch (drag), mouse wheel and keyboard, at 44px or larger.

## Reference

`web/components/game/screens/RadioMeteorScreen.tsx` (gain, zoom and sweep dials; radio desk).
