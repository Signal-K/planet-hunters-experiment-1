---
title: Mission System Specification
createdAt: '2026-02-25T08:19:42.936Z'
updatedAt: '2026-04-25T00:15:10.428Z'
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
Star Sailors: Experiment 1 uses an authored onboarding arc for **Mission 1 to Mission 4**, then transitions into **Free Operations**.

- Authored missions: M1, M2, M3, M4
- Post-onboarding loop: Free Operations (no authored Mission 5 chain)
- Legacy M5 and legacy scanner-build references are archive-only and non-authoritative

Primary reference:
- @doc/specs/post-m4-free-ops-product-decisions-2026-03-10

## Product Principles
- Readability and usability are prioritized over visual complexity.
- Guidance should be soft and lightweight, and must not cover too much of the UI.
- Player-facing scanner/candidate language should remain player-friendly.
- Earth-base guidance should avoid stacking multiple tutorial surfaces for the same state.

## Progression Model

### Authored Onboarding (M1-M4)
1. Mission 1: launch, mine, return, debrief baseline loop.
2. Mission 2: Control Station construction and structured contractor route.
3. Mission 3: scanner/candidate context, real citizen-science data, and classification intro.
4. Mission 4: autonomy transition. Player reopens the Launchpad and can choose a contractor-led run or a self-directed survey run with lighter guidance.

### Free Operations (Post-M4)
- Unlimited mission runs.
- Player can choose known targets or unconfirmed candidates each run.
- Soft recommendations can be shown, but no hard authored chain.
- Current focus: add new missions/targets inside Free Ops loop rather than introducing a new fixed authored chain.

## Contractor Rules
- Contractor is chosen when starting a structured contract run.
- Mission 4 is the first point where the player can deliberately choose between contractor structure and a self-directed survey run.
- Contractor expression is scoped **per mission and per rocket** (visual + gameplay context).
- No global lockout or forced long cooldown behavior.

## Target and Candidate Rules
- Unconfirmed candidates (for example TIC candidates or asteroid candidates) can be selected for classification flow.
- If classification does not confirm candidate validity:
  - candidate visit is blocked for that attempt,
  - player is prompted to pick another target,
  - reward is still granted.
- Failed-confirmation reward is flat XP.

## Citizen Science Rewards
- Discovery cadence target: player should encounter discovery opportunities every run.
- Discovery travel bonus: **10% + 1% per annotation level**.
- Annotation depth contributes to bonus scaling and progression utility.
- Penalty system for incorrect classifications remains deferred:
  - tracking: `task-lkzqm0`

## UX/Copy Rules
- Scanner and candidate prompts use player-friendly wording.
- Guidance surfaces must stay compact and avoid obscuring core controls.
- Mission 4 copy should frame the moment as autonomy/free-choice, not as a scanner construction gate.
- Backgrounds may stay full-screen while actionable controls are inset for safe interaction regions.

## Implementation Anchors
- Mission/free-ops state: `scene/Scripts/Utils/RocketsManager.gd`
- Launchpad prep and target flow: `scene/Scripts/Earth/LaunchpadSelectorPanel.gd`
- Launch guardrails: `scene/Scripts/Earth/LaunchpadLaunchButton.gd`
- Candidate classification path: `scene/Scripts/UI/AsteroidDetail/AsteroidDetailView.gd`
- Debrief/reward behavior: `scene/Scripts/Earth/MissionDebriefV2.gd`

## Historical Note
- Previous Mission 5 contractor chain design is retained only for historical context in older docs/tasks and should not be used as the source of truth.
- Previous references to Mission 4 beginning with building the Scanner Station are also historical and should not be restored.
