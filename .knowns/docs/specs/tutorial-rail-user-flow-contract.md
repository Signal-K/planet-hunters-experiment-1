---
title: Tutorial rail user flow contract
description: Canonical onboarding user flow + dedicated tutorial lane rules for all UI panels
createdAt: '2026-03-14T06:32:53.469Z'
updatedAt: '2026-04-25T02:27:21.904Z'
tags: []
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
- M1 -> M2 -> M3 -> handoff dialogue -> Free Operations
- M3 is the last authored tutorial mission; it introduces citizen-science/data-classification
- After M3 debrief, a single handoff dialogue signals the player is now on their own
- The handoff dialogue is NOT a tutorial — it is a brief transition moment
- Free Operations begins immediately after the dialogue is dismissed
- There is no "Mission 4" tutorial, authored objective chain, or M4 guidance rail

## Dedicated Tutorial Rail (Layout Contract)

The tutorial/help system uses a fixed, dedicated right-side rail.

Rules:
- Tutorial panel always renders in `TutorialLayoutZone.reserved_rect(...)`.
- Gameplay/interactive panels must render in `TutorialLayoutZone.content_rect(...)`.
- No runtime auto-reposition or auto-hide of random controls.
- No tooltip, guide arrow, or highlight may occlude primary click targets.
- If a screen cannot satisfy this, it must explicitly hide or suspend tutorial UI for that screen.
- Earth Base should not stack multiple guidance surfaces for the same progression state. One primary authored/tutorial prompt is enough.
- Post-M3 Earth Base shows soft guidance only (no tutorial rail, no stacked prompts).

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
