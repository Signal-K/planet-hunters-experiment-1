---
title: Tutorial rail user flow contract
createdAt: '2026-03-14T06:32:53.469Z'
updatedAt: '2026-03-14T06:33:24.745Z'
description: >-
  Canonical onboarding user flow + dedicated tutorial lane rules for all UI
  panels
---
# Tutorial Rail User Flow Contract

## Canonical User Flow (Onboarding)

1. Base Tour
- Open Control Station
- Close Control Station

2. Launch Prep
- Press New Mission
- Select one contractor
- Create one rocket
- Select one mission target
- Press Launch

3. Mission Loop
- Mine required resources
- Return home
- Resolve debrief

4. Progression
- M1 -> M2 -> M3 -> M4
- After M4, Free Operations unlocks

References:
- @doc/specs/user-flow-and-citizen-science-specification
- @doc/specs/mission-system-specification
- @doc/specs/mission-flowchart-diagrams
- Existing runtime catalog: `scene/Scripts/Tutorial/TutorialCatalog.gd`

## Dedicated Tutorial Rail (Layout Contract)

The tutorial/help system uses a fixed, dedicated right-side rail.

Rules:
- Tutorial panel always renders in `TutorialLayoutZone.reserved_rect(...)`.
- Gameplay/interactive panels must render in `TutorialLayoutZone.content_rect(...)`.
- No runtime auto-reposition or auto-hide of random controls.
- No tooltip, guide arrow, or highlight may occlude primary click targets.
- If a screen cannot satisfy this, it must explicitly hide/suspend tutorial UI for that screen.

## Required Integration Points

- Base/Launchpad nav: menu + panels must avoid tutorial rail.
- Launchpad selector/contractor/target UI must stay inside content rect.
- Mission/debrief overlays must avoid the tutorial rail or explicitly suppress tutorial for the scene.

## Reset Behavior Contract

`Reset All Data` must also clear mission UI carry-over state:
- pending mission guidance id
- return-to-new-mission flags
- preview/returned mission caches
- launchpad selector visibility outside launchpad scene

After reset, the user should remain in clear base context (no launchpad selector unless they open Launchpad).
