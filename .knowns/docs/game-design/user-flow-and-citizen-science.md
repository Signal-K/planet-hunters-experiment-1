---
title: User Flow & Citizen Science Integration
createdAt: '2026-02-25T08:23:19.256Z'
updatedAt: '2026-03-17T06:47:20.576Z'
description: Hybrid resource management game and citizen science platform integration
tags:
  - game-design
  - citizen-science
  - user-flow
  - gameplay
---
# User Flow & Citizen Science Integration

## Overview

Star Sailors: Experiment 1 is a hybrid resource management game and citizen science platform where players explore the solar system and beyond, conducting mining missions to real astronomical targets while contributing to actual scientific discovery. The core gameplay loop interweaves economic progression with authentic data from space telescopes, creating an experience where entertainment and scientific contribution are inseparable. Players scan the cosmos using real TESS (Transiting Exoplanet Survey Satellite) telescope data and asteroid databases, select targets for resource extraction missions, and analyze celestial objects — activities that mirror real astronomical research workflows and can generate scientifically valuable classifications.

## Core User Flow & Citizen Science Touchpoints

The primary gameplay cycle begins at **Earth Base**, the player's planetary headquarters featuring three key structures: the **Satellite Station** (scanner/telescope), **Control Station** (mission command), and **Launchpad** (launch facility). Players initiate missions by visiting the Satellite Station to scan space for targets. This scanning process pulls real astronomical data from Supabase databases, including active asteroids and exoplanet candidates from the TESS telescope mission — the same data professional astronomers and citizen scientists use in real discovery programs. When scanning, players see authentic light curve data, object identifiers (TIC IDs for TESS objects), and positional information, presented through an in-game interface that abstracts the complexity while preserving scientific authenticity.

Once scan results arrive, players can **view detailed information** about each celestial object, including distance (in Astronomical Units), object type, and visual data representations. The **annotation and classification system** enables players to mark features on light curves or asteroid images, categorize anomalies, and flag objects for further review — activities that directly parallel Zooniverse-style projects like the Planet Hunters TESS citizen science project. These contributions are saved locally and, in future iterations, synced to contribute to real scientific databases.

After selecting a target, players transition to the **Mission Planning** phase at the Launchpad, where they configure their rocket, review mission parameters, and purchase a rocket for that trip. Missions progress through **Transit**, **Mining/Scanning**, and **Return** phases. Upon return, the **End-of-Rocket Debrief** presents all activity from that rocket's lifetime: mining yields, XP gained, total payout, and options to sell cargo or archive scientific data.

## Citizen Science Mechanics

The **Satellite Station** serves as the primary citizen science hub. The game sources real anomaly data from public astronomical databases via Supabase integration. The classification workflow allows players to mark features, submit classifications, and optionally provide observations. A toggleable "science dialogue mode" provides richer explanations for engaged players without interrupting those focused on economic optimization.

XP is awarded for both launching missions (`XP_AWARD_LAUNCH`) and completing scans (`XP_AWARD_SCAN`), mechanically equalizing science and mining to encourage both. Annotated images and classifications are stored in `user://annotations/` with plans to sync to Supabase tables mirroring Zooniverse schemas.

## Personal Discoveries Log

- Visible and accessible **from Day 1** (star map or player profile).
- Shows: all personally discovered targets, date, classification status, player name attribution.
- Starts sparse; grows with the player. The early emptiness is intentional — something to grow into.
- Core identity feature: "these are the objects I found."

## Scanner Station Long-Term Relevance

The scanner remains relevant at L6+ through:
1. **New TESS candidates daily** — fresh unclassified objects from the live feed.
2. **New candidate types** — different object classes and anomalies emerging over time.
3. **Social layer** — seeing other players' classifications on the same candidates.

The scanner station becomes the social/discovery hub as the game matures.

## Naming Note

- **"Planet Hunters"** is the name of a citizen science project within the game (analogous to Zooniverse's Planet Hunters TESS), **not the game name**.
- The game is "Star Sailors: Experiment 1."
- All "Planet Hunters" references in this document refer to the in-game classification project.
