---
title: Mission System Specification
createdAt: '2026-02-25T08:19:42.936Z'
updatedAt: '2026-03-17T06:46:41.354Z'
description: >-
  Complete specification for all 5 missions including objectives, mechanics,
  progression, rewards, and onboarding flow
tags:
  - missions
  - spec
  - design
  - game-design
---
# Mission System Specification (Authoritative)

## Scope
Planet Hunters uses an authored onboarding arc for **Mission 1 to Mission 4**, then transitions into **Free Operations**.

- Authored missions: M1, M2, M3, M4
- Post-onboarding loop: Free Operations (no authored Mission 5 chain)
- Legacy M5 references in historical docs are archive-only and non-authoritative

Primary reference:
- @doc/specs/post-m4-free-ops-product-decisions-2026-03-10

## Product Principles
- Readability and usability are prioritized over visual complexity.
- Guidance should be soft and lightweight, and must not cover too much of the UI.
- Player-facing scanner/candidate language should remain player-friendly.

## Progression Model

### Authored Onboarding (M1-M4)
1. Mission 1: launch/mine/return/debrief baseline loop.
2. Mission 2: upgrade reinforcement and economy pacing.
3. Mission 3: scanner/candidate context and classification intro.
4. Mission 4: planetary expansion and transition to open loop readiness.

### Free Operations (Post-M4)
- Unlimited mission runs.
- Player can choose known targets or unconfirmed candidates each run.
- Soft recommendations can be shown, but no hard authored chain.
- Current focus: add new missions/targets inside Free Ops loop rather than introducing a new fixed authored chain.

## Contractor Rules
- Contractor is chosen at mission start (before target selection).
- Contractor choice is required each trip.
- Contractor expression is scoped **per mission and per rocket** (visual + gameplay context).
- No global lockout or forced long cooldown behavior.

## Target and Candidate Rules
- Unconfirmed candidates (e.g. TIC candidates, asteroid candidates) can be selected for classification flow.
- If classification does not confirm candidate validity:
  - candidate visit is blocked for that attempt,
  - player is prompted to pick another target,
  - reward is still granted.
- Failed-confirmation reward is **variable** by context/stage (not flat globally).

## Citizen Science Rewards
- Discovery cadence target: player should encounter discovery opportunities every run.
- Discovery travel bonus: **10% + 1% per annotation level**.
- Annotation depth contributes to bonus scaling and progression utility.
- Penalty system for incorrect classifications remains deferred:
  - tracking: `task-lkzqm0`

## UX/Copy Rules
- Scanner and candidate prompts use player-friendly wording.
- Guidance surfaces must stay compact and avoid obscuring core controls.
- Backgrounds may stay full-screen while actionable controls are inset for safe interaction regions.

## Implementation Anchors
- Mission/free-ops state: `scene/Scripts/Utils/RocketsManager.gd`
- Launchpad prep and target flow: `scene/Scripts/Earth/LaunchpadSelectorPanel.gd`
- Launch guardrails: `scene/Scripts/Earth/LaunchpadLaunchButton.gd`
- Candidate classification path: `scene/Scripts/UI/AsteroidDetail/AsteroidDetailView.gd`
- Debrief/reward behavior: `scene/Scripts/Earth/MissionDebrief.gd`

## Historical Note
- Previous Mission 5 contractor chain design is retained only for historical context in older docs/tasks and should not be used as the source of truth.



## 2026-03-10 Clarification Update
- Failed-confirmation reward remains flat XP.
- Discovery cadence target refers to candidate opportunity availability every run, not guaranteed confirmation outcomes.
- Player-friendly wording should be applied only in player-facing prompts; internal/canonical terminology can remain technical.

## Design Round 3 — 2026-03-17

### End-of-Rocket Debrief (Q13)
- Debrief is a **universal end-of-rocket review**, not per-mission.
- Triggered when a rocket is empty, destroyed, salvaged, or scrapped.
- Shows everything the rocket did: all runs, total minerals harvested, total payout, XP gained.
- Applies whether missions were contractor-attached, free-launch, or mixed.
- Post-L5: includes market comparison for minerals delivered.
- Post-M4: includes contractor affinity change if applicable.

### Free-Launch Missions (Q17)
- Free-launch (no contractor) is a **full autonomy mode** — player mines for personal goals.
- Use cases: gathering materials for own construction, exploration, personal discovery.
- Not just "selling to market" — it is a distinct intent: building for yourself.
- Same debrief applies (end-of-rocket review).
- Discovery XP bonus still applies if a new target is found.

### Naming Note
- Previous references to "Planet Hunters" in this document mean the citizen science workflow within Star Sailors: Experiment 1, not the game name.
