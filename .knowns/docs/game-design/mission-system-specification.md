---
title: Mission System Specification
description: Complete specification for all 5 missions including objectives, mechanics, progression, rewards, and onboarding flow
createdAt: '2026-02-25T08:19:42.936Z'
updatedAt: '2026-04-25T02:26:12.129Z'
tags:
  - missions
  - spec
  - design
  - game-design
---

# Mission System Specification (Authoritative)

## Scope
Star Sailors: Experiment 1 uses an authored onboarding arc for **Mission 1 to Mission 3 only**, then transitions into **Free Operations** via a handoff dialogue.

- Authored missions: M1, M2, M3
- Post-onboarding entry: single handoff dialogue after M3 debrief → Free Operations
- There is no "Mission 4" tutorial or authored M4 objective chain
- Legacy M4/M5 authored-mission references and scanner-build gates are archive-only and non-authoritative

Primary reference:
- @doc/specs/post-m4-free-ops-product-decisions-2026-03-10

## Product Principles
- Readability and usability are prioritized over visual complexity.
- Guidance should be soft and lightweight, and must not cover too much of the UI.
- Player-facing scanner/candidate language should remain player-friendly.
- Earth-base guidance should avoid stacking multiple tutorial surfaces for the same state.
- The handoff from tutorial to Free Ops is a single dialogue moment, not an additional tutorial rail.

## Progression Model

### Authored Onboarding (M1-M3)
1. Mission 1: launch, mine, return, debrief baseline loop.
2. Mission 2: Control Station construction and structured contractor route.
3. Mission 3: scanner/candidate context, real citizen-science data, and classification intro.

### Post-M3 Handoff
- After M3 debrief, the player receives a single handoff dialogue explaining Free Operations.
- The dialogue is not a tutorial — it is a transition moment ("you're on your own now").
- No additional authored objectives, gating, or guidance rail is attached to this moment.
- Free Operations begin immediately after the player dismisses the dialogue.

### Free Operations (Post-M3)
- Unlimited mission runs.
- Player can choose known targets or unconfirmed candidates each run.
- Soft recommendations can be shown, but no hard authored chain.
- SR3 (Starter Rocket 3) and planet targets are Free Ops features — not tied to a tutorial mission.
- Current focus: add new missions/targets inside Free Ops loop rather than introducing a new fixed authored chain.

## Contractor Rules
- Contractor is chosen when starting a structured contract run.
- The first Free Ops run is the first point where the player can deliberately choose between contractor structure and a self-directed survey run.
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
- Post-M3 copy frames the moment as "you're now operating freely" — not as entering a new mission.
- No copy should use the phrase "Mission 4" or describe a 4th tutorial objective.
- Backgrounds may stay full-screen while actionable controls are inset for safe interaction regions.

## Implementation Anchors
- Mission/free-ops state: `scene/Scripts/Utils/RocketsManager.gd`
- Launchpad prep and target flow: `scene/Scripts/Earth/LaunchpadSelectorPanel.gd`
- Launch guardrails: `scene/Scripts/Earth/LaunchpadLaunchButton.gd`
- Candidate classification path: `scene/Scripts/UI/AsteroidDetail/AsteroidDetailView.gd`
- Debrief/reward behavior: `scene/Scripts/Earth/MissionDebriefV2.gd`
- Free Ops handoff dialogue: triggered after M3 debrief completion

## Historical Note
- Code internals may use a "mission stage 4" or `completed_mission_count >= 4` check as the Free Ops gate. This is an implementation detail, not an authored M4 mission.
- Previous M4 descriptions (planetary expansion, scanner-build gate, autonomy tutorial) are historical and must not be used as design source of truth.
- Previous Mission 5 contractor chain design is retained only for historical context in older docs/tasks.
