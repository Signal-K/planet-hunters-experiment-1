---
title: 'User Flow & Citizen Science Integration'
description: Hybrid resource management game and citizen science platform integration
createdAt: '2026-02-25T08:23:19.256Z'
updatedAt: '2026-05-13T08:07:46.218Z'
tags:
  - project-landnam
  - doc-kind-general
  - game-design
  - citizen-science
  - user-flow
  - gameplay
  - mission
  - missions
  - design
---

[← Back to Index](../INDEX.md)

# User Flow & Citizen Science Integration

## Overview

Star Sailors: Experiment 1 is a hybrid resource management game and citizen science platform where players explore the solar system and beyond, conduct missions to real astronomical targets, and contribute to actual scientific discovery. For the upcoming release, the active science loop centers on **planet hunting** with real TESS-style candidate review.

## Core User Flow & Citizen Science Touchpoints

The primary gameplay cycle begins at **Earth Base**, featuring three key structures: the **Satellite Station** (scanner/telescope), **Control Station** (mission command), and **Launchpad** (launch facility).

Mission structure:
- **Mission 1:** baseline launch, mine, return, debrief.
- **Mission 2:** build the Control Station and learn the more structured contractor flow.
- **Mission 3:** first real citizen-science mission. The player works with live-style TESS candidate data, reviews lightcurves, classifies a planet candidate, and routes to a confirmed target.
- **After Mission 3:** a single handoff dialogue informs the player that the tutorial is complete and they are now in Free Operations. Free Operations begins immediately after.

There is no authored Mission 4. What was previously called "M4" is Free Operations. Features like SR3, planet targets, and multi-buyer debrief are Free Ops features unlocked by level/progression, not attached to a tutorial mission.

## Release Scope Lock
- The **Mission 3** science loop is **planet-candidate review only**.
- **Everything after the tutorial** keeps the same planet-hunting focus.
- **Asteroid detection/classification and any Active Asteroids / Daily Minor Planet / Zooniverse-style integration are out of scope for this release.**
- If asteroid review returns later, it should be reintroduced as a fresh integration project with its own mechanics and order of operations.

The **Satellite Station** is part of the Mission 3 and onward science workflow. It should not be framed as a separate construction gate in player-facing copy. When scanning, players see authentic lightcurve data, object identifiers (such as TIC IDs for TESS objects), and positional information, presented through an in-game interface that abstracts the complexity while preserving scientific authenticity.

Once scan results arrive, players can **view detailed information** about each candidate, annotate the lightcurve, classify the signal, and route confirmed targets into mission planning at the Launchpad.

After selecting a target, players transition to **Mission Planning** at the Launchpad. Missions progress through **Transit**, **Mining/Scanning**, and **Return** phases. Upon return, the **End-of-Rocket Debrief** presents mining yields, XP gained, payout, and the next handoff into either authored progression or Free Operations.

## Citizen Science Mechanics

The **Satellite Station** serves as the primary citizen-science hub. The game sources anomaly data from public astronomical databases via Supabase integration. The active classification workflow allows players to mark features on TESS lightcurves, submit planet/not-planet verdicts, and optionally provide observations.

XP is awarded for both launching missions and completing scans, mechanically equalizing science and mining to encourage both. Annotated images and classifications are stored in user annotations with plans to sync to Supabase tables mirroring live community-review schemas.

## Personal Discoveries Log

- Visible and accessible from Day 1 (star map or player profile).
- Shows all personally discovered targets, date, classification status, and player attribution.
- Starts sparse and grows with the player over time.

## Scanner Station Long-Term Relevance

The scanner remains relevant through:
1. New TESS candidates arriving over time.
2. New candidate classes and anomalies entering the pool.
3. A future social layer where multiple players can classify the same candidates.

## Naming Note

- **Planet Hunters** is the name of a citizen-science project within the game, not the game name.
- The game is **Star Sailors: Experiment 1**.
