---
title: Tutorial rail user flow contract
createdAt: '2026-03-14T06:32:53.469Z'
updatedAt: '2026-04-25T00:15:10.414Z'
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
- Select one contractor when the run calls for it
- Create one rocket
- Select one mission target
- Press Launch

3. Mission Loop
- Mine required resources
- Return home
- Resolve debrief

4. Progression
- M1 -> M2 -> M3 -> M4
- M3 is the first real citizen-science/data-classification mission
- M4 is the autonomy handoff: reopen Launchpad, choose a contractor run or a self-directed survey route
- After M4, Free Operations unlocks

## Dedicated Tutorial Rail (Layout Contract)

The tutorial/help system uses a fixed, dedicated right-side rail.

Rules:
- Tutorial panel always renders in `TutorialLayoutZone.reserved_rect(...)`.
- Gameplay/interactive panels must render in `TutorialLayoutZone.content_rect(...)`.
- No runtime auto-reposition or auto-hide of random controls.
- No tooltip, guide arrow, or highlight may occlude primary click targets.
- If a screen cannot satisfy this, it must explicitly hide or suspend tutorial UI for that screen.
- Earth Base should not stack multiple guidance surfaces for the same progression state. One primary authored/tutorial prompt is enough.

## Required Integration Points

- Base/Launchpad nav: menu + panels must avoid tutorial rail.
- Launchpad selector/contractor/target UI must stay inside content rect.
- Mission/debrief overlays must avoid the tutorial rail or explicitly suppress tutorial for the scene.
- Compact helper trackers should not compete with Earth-base progression cards during authored onboarding.

## Reset Behavior Contract

`Reset All Data` must also clear mission UI carry-over state:
- pending mission guidance id
- return-to-new-mission flags
- preview/returned mission caches
- launchpad selector visibility outside launchpad scene

After reset, the user should remain in clear base context with no stale scanner-build or duplicate tutorial prompts.
