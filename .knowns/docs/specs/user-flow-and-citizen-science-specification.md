---
title: 'spec,user-flow,citizen-science,gameplay,reference'
createdAt: '2026-02-25T08:23:19.256Z'
updatedAt: '2026-03-10T07:09:35.860Z'
description: Hybrid resource management game and citizen science platform integration
spec: true
tags:
  - game-design
  - citizen-science
  - user-flow
  - gameplay
---
# Planet Hunters: User Flow & Citizen Science Integration

## Product Intent

Planet Hunters combines resource-mining gameplay with citizen-science style target classification. The first four missions teach mechanics; after that, players enter open-ended Free Operations.

## End-to-End Player Flow

1. Enter base and select launch flow.
2. Pick contractor for this trip (required).
3. Select target.
4. Launch, mine, return.
5. Resolve debrief rewards.
6. Repeat with full freedom after Mission 4.

## Mission Flow Phases

### Authored Onboarding (M1-M4)

- Mission 1: baseline loop intro
- Mission 2: upgrade/economy reinforcement
- Mission 3: scanner + candidate context
- Mission 4: planetary expansion

### Free Operations (after M4)

- No authored mission chain beyond 4
- Players can go anywhere valid and run unlimited trips
- Progression remains via XP, upgrades, unlocks, and efficiency

## Contractor UX Rules

- Contractor choice occurs at mission start (before target selection)
- Contractor choice required every trip
- Player can switch contractors every mission
- No forced cooldown or lockout

## Target Types and Access Rules

- Players can select known existing targets or newly discovered/unconfirmed targets
- "Unconfirmed" includes TIC candidates and asteroid candidates
- If classification does not confirm target validity:
  - grant reward (fixed XP)
  - block immediate visit to that candidate
  - prompt player to choose another target
- Candidate can be revisited later after additional scan/classification updates

## Citizen Science Reward Rules

- Discovery travel bonus: **10% + 1% per annotation level**
- Bonus is one-time per target
- Fixed XP for classification outcomes (current phase)
- Penalty system for incorrect classifications is deferred to future design
  - tracking: `task-lkzqm0`

## Classification Interaction

- Players can classify candidate targets (Planet / Not a Planet)
- Annotation depth is persisted and feeds discovery bonus scaling
- Transit dip marking is supported as explicit annotation input
- Submission payload includes verdict + annotation metadata

## Narrative / Guidance Behavior

- First tutorial pass is required once per save
- After first completion, narrative/tutorial flow can be skipped
- Keep mission language simple and low-friction

## Platform / QA Focus

Primary device families for regression:
- iPhone (regular + Pro Max)
- Nothing Phone
- Samsung Galaxy series
- Google Pixel series

## Open Design Direction

The post-tutorial shape is intentionally "sandbox-first":
- broad player agency
- minimal hard gating
- progression via capability expansion and convenience improvements

## Implementation References

- Mission and free-ops state: `scene/Scripts/Utils/RocketsManager.gd`
- Launchpad mission prep UX: `scene/Scripts/Earth/LaunchpadSelectorPanel.gd`
- Launch guardrails: `scene/Scripts/Earth/LaunchpadLaunchButton.gd`
- Debrief reward calculations: `scene/Scripts/Earth/MissionDebrief.gd`
- Candidate classification UX: `scene/Scripts/UI/AsteroidDetail/AsteroidDetailView.gd`
- Scanner persistence/selection: `scene/Scripts/UI/SatelliteStationPanel.gd`



## 2026-03-10 Clarification Update
- Keep failed-confirmation reward flat XP.
- "Every run" discovery target means candidate options should appear each run; confirmation remains uncertain by design.
- Apply player-friendly language in player-facing prompts only.



## 2026-03-10 Hands-on Clarifications
- Free Ops routes are currently limited to `contract` and `survey`.
- Contractor choice is required at run start before target selection.
- Candidate failure handling remains manual (prompt to choose another target, no auto-pick).
- Discovery bonus calculation is applied on net payout.
- Scanner refresh now uses a soft cooldown to pace retries.
- Messaging target: player-friendly and concise for users without exoplanet expertise.
