---
title: 'spec,missions,game-design,reference'
createdAt: '2026-02-25T08:19:42.936Z'
updatedAt: '2026-03-10T07:09:38.078Z'
description: >-
  Complete specification for all 5 missions including objectives, mechanics,
  progression, rewards, and onboarding flow
spec: true
tags:
  - missions
  - spec
  - design
  - game-design
---
# Mission System Specification

## Overview

Planet Hunters uses a 4-mission authored onboarding sequence followed by a persistent **Free Operations** sandbox. Missions 1-4 teach mechanics and target types. After Mission 4, players can run unlimited trips with full target and contractor choice.

## Progression Model

- **Authored progression**: M1 -> M2 -> M3 -> M4
- **Post-onboarding**: Free Operations unlocks immediately after Mission 4 completion
- **No authored Mission 5+**: Future missions can be added later as separate content tasks
- **Persistence**: mission completion, target state, and contractor state are stored in game state

## Mission Structure

Each authored mission keeps the same core loop:
1. Prep (rocket + contractor + target)
2. Launch
3. Mining
4. Return
5. Debrief

## Mission 1: Starter Loop

- Goal: teach full basic loop and contractor-at-start behavior
- Target type: predefined asteroid
- Requirements: Starter Rocket 1
- Completion: finish debrief
- Unlocks: Mission 2

## Mission 2: Upgrade Loop

- Goal: reinforce loop with improved rocket and economics
- Target type: asteroid variants
- Requirements: Starter Rocket 2
- Completion: finish debrief
- Unlocks: Mission 3

## Mission 3: Scanner + Candidate Flow

- Goal: teach scanning, selection from discovered targets, and candidate evaluation context
- Target type: scanned candidates
- Requirements: scanner usage
- Completion: finish debrief
- Unlocks: Mission 4

## Mission 4: Planetary Expansion

- Goal: teach longer-range exploration and planetary targeting
- Target type: planets
- Requirements: higher-range rocket, scanner-assisted selection
- Completion: finish debrief
- Unlocks: **Free Operations**

## Free Operations (Post-M4)

- Unlimited trips
- Complete target freedom across discovered/known valid targets
- Contractor selected at mission start every trip
- Unlimited discovery attempts and reruns
- Progression focus shifts to optimization, unlocks, and player-defined goals

## Contractor Rules

- Contractor choice is required before target selection/launch for each trip
- Player can pick a different contractor every mission
- No cooldown on contractor switching
- Contractor-specific effects remain active for that trip

## Candidate Confirmation Rules

- Applies to unconfirmed candidates (for example TIC candidates or asteroid candidates)
- If player classification does **not** confirm candidate as real:
  - player still receives reward (XP)
  - candidate is blocked from immediate visit
  - player is prompted to choose another target
- Candidate can become visitable later after re-scan/reconfirmation

## Discovery Bonus Rules

- If player discovers and travels to a new/unconfirmed target, apply bonus:
  - **10% base + 1% per annotation level**
- Bonus is tracked per target and applied once per target

## Reward Rules (Current)

- Classification and confirmation outcomes use fixed XP rewards for now
- Keep reward model intentionally simple during current playtest phase
- Future balancing can add richer XP scaling

## Deferred Systems

- Penalties for incorrect classifications are deferred
- Tracking task: `task-lkzqm0`

## Testing / UX Focus

- Device regression targets:
  - iPhone (regular + Pro Max)
  - Nothing Phone
  - Samsung Galaxy series
  - Google Pixel series
- Narrative flow:
  - first-time guidance required once per save
  - skippable after first completion

## Implementation References

- Core state/logic: `scene/Scripts/Utils/RocketsManager.gd`
- Mission stage mapping: `scene/Scripts/Utils/RocketsMissionProgress.gd`
- Launchpad target + contractor selection: `scene/Scripts/Earth/LaunchpadSelectorPanel.gd`
- Launch gating: `scene/Scripts/Earth/LaunchpadLaunchButton.gd`
- Debrief rewards: `scene/Scripts/Earth/MissionDebrief.gd`
- Classification behavior: `scene/Scripts/UI/AsteroidDetail/AsteroidDetailView.gd`



## 2026-03-10 Hands-on Clarifications
- Keep only two post-M4 route modes for now: `contract` and `survey`.
- Contractor selection is required at mission start before target selection.
- Discovery bonus (`10% + 1% per annotation level`) applies to net payout.
- Mission 4 completion should explicitly communicate Free Operations unlock.
