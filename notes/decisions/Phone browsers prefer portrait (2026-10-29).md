---
type: decision
title: Phone browsers prefer portrait
project: Landnam
status: decided
created: 2026-10-29
---

# Phone browsers prefer portrait (2026-10-29)

Decided by Liam (SSL-365). iOS builds cannot reach TestFlight yet, so the week from 2026-10-29
is web and installed PWA only.

## Decision

- In a phone browser tab, landscape loses about a third of the screen to the browser's bars
  and iPhone Safari cannot hide them. So in a browser, portrait is strongly preferred: a
  sideways phone is asked to turn upright, or to install Landnam for full-screen landscape.
- Installed as a PWA, the game plays full screen either way up.
- Therefore every scene must look its best in portrait, not just fit.
- Navigation and menus take as little of the scene as possible: on a short landscape phone the
  Base dock is one slim row; upright, two.

## Next

Portrait pass, one scene at a time, worst first: Rover, Market, Control station, Flight, Base.
