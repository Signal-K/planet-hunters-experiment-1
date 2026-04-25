---
title: User Flow & Citizen Science Integration
createdAt: '2026-02-25T08:23:19.256Z'
updatedAt: '2026-04-25T00:15:10.413Z'
description: Hybrid resource management game and citizen science platform integration
tags:
  - game-design
  - citizen-science
  - user-flow
  - gameplay
---
# User Flow & Citizen Science Integration

## Overview

Star Sailors: Experiment 1 is a hybrid resource management game and citizen science platform where players explore the solar system and beyond, conduct mining missions to real astronomical targets, and contribute to actual scientific discovery. The core loop interweaves economic progression with authentic data from space telescopes so that scientific interaction is part of normal play rather than a detached side mode.

## Core User Flow & Citizen Science Touchpoints

The primary gameplay cycle begins at **Earth Base**, the player's planetary headquarters featuring three key structures: the **Satellite Station** (scanner/telescope), **Control Station** (mission command), and **Launchpad** (launch facility).

Mission structure now works like this:
- **Mission 1:** baseline launch, mine, return, debrief.
- **Mission 2:** build the Control Station and learn the more structured contractor flow.
- **Mission 3:** first real citizen-science mission. The player works with live-style TESS candidate data, reviews lightcurves, classifies a candidate, and then routes to a confirmed target.
- **Mission 4:** transition out of the strict tutorial rail. The player reopens the Launchpad and chooses whether to run a contractor-guided trip or a more self-directed survey run.
- **After Mission 4:** Free Operations. Guidance becomes softer and the player is expected to operate with more independence.

The **Satellite Station** is part of the Mission 3 and onward science workflow. It should not be framed as a separate Mission 4 construction gate in player-facing copy. When scanning, players see authentic lightcurve data, object identifiers (such as TIC IDs for TESS objects), and positional information, presented through an in-game interface that abstracts the complexity while preserving scientific authenticity.

Once scan results arrive, players can **view detailed information** about each celestial object, including distance, object type, and visual data representations. The **annotation and classification system** enables players to mark features on lightcurves or asteroid images, categorize anomalies, and flag objects for further review. These contributions mirror real citizen-science research workflows.

After selecting a target, players transition to **Mission Planning** at the Launchpad, where they configure their rocket, review mission parameters, and purchase a rocket for that trip. Missions progress through **Transit**, **Mining/Scanning**, and **Return** phases. Upon return, the **End-of-Rocket Debrief** presents mining yields, XP gained, payout, and the next handoff into either authored progression or Free Operations.

## Citizen Science Mechanics

The **Satellite Station** serves as the primary citizen-science hub. The game sources anomaly data from public astronomical databases via Supabase integration. The classification workflow allows players to mark features, submit classifications, and optionally provide observations. A toggleable science dialogue mode provides richer explanations for engaged players without interrupting those focused on economic optimization.

XP is awarded for both launching missions and completing scans, mechanically equalizing science and mining to encourage both. Annotated images and classifications are stored in `user://annotations/` with plans to sync to Supabase tables mirroring Zooniverse-like schemas.

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
