---
title: Post-M4 Free Ops Product Decisions (2026-03-10)
createdAt: '2026-03-10T06:05:07.254Z'
updatedAt: '2026-03-10T07:09:33.641Z'
description: >-
  Locked gameplay/product decisions from live design review; supersedes legacy
  Mission 5 assumptions
tags:
  - spec
  - missions
  - free-ops
  - mobile
  - art-direction
---
# Post-M4 Free Ops Product Decisions (Locked 2026-03-10)

## Scope Lock
- Core authored progression is **Mission 1 through Mission 4 only**.
- Everything after Mission 4 uses **Free Operations**.
- Focus now is adding new missions/targets within Free Ops rather than introducing a fixed post-M4 authored chain.

## Locked Gameplay Decisions
1. **Readability and usability are always prioritized**.
2. Scanner/candidate UX language should be **player-friendly**.
3. Players pick a contractor at mission start for each trip.
4. Contractor identity should apply **per mission and per rocket**.
5. Players can choose known targets or unconfirmed candidates.
6. Unconfirmed candidates must be confirmed before visit; failed confirmation still grants reward.
7. Failed-confirmation reward should **vary by context**, not be globally flat.
8. Discovery opportunity target cadence: **every run**.
9. Post-M4 guidance is soft and should not occupy too much UI.
10. Penalty mechanics for incorrect classifications remain deferred (future): `task-lkzqm0`.

## Reward Lock
- Discovery travel bonus remains **10% + 1% per annotation level**.
- Keep progression understandable and low-friction in copy.

## Art Direction Lock
- Production quality target for prompt batches.
- Contractor identity should be visibly themed in room art.
- Wear progression is subtle.
- Wear/progression memory should be **permanent per rocket**.

## Mobile/PWA UX Lock
- Support baseline: iPhone regular + Pro Max, Nothing Phone, Samsung Galaxy, Pixel.
- Keep background full-screen.
- Move actionable controls inward from cutouts/notches/dynamic island/gesture edges using safe-area insets.
- Keep HUD compact to avoid obscuring gameplay.

## References
- @doc/game-design/mission-system-specification
- @doc/specs/user-flow-and-citizen-science-specification
- @doc/specs/pwa-standalone-game-shell-layout-behavior



## 2026-03-10 Clarification Update (Latest)
- Failed-confirmation reward is **flat XP** (not variable).
- "Discovery every run" means every run should expose candidate opportunities; it does **not** guarantee a true transit/confirmation candidate.
- Candidate terminology remains in scientific/backend models; use player-friendly wording in player-facing prompts only.



## 2026-03-10 Decision Update (Hands-on Pass)
- Keep only **two Free Ops routes** for now: `contract` and `survey`.
- Contractor is selected when starting a run; target selection remains locked until contractor is selected.
- Failed candidate path stays **manual** (no auto-target replacement).
- Discovery bonus applies to **net payout**.
- Free Operations unlock should be shown **explicitly** in UI messaging.
- Scanner uses a **soft cooldown** (not hard lock).
- Mobile readability rule: use larger text + shorter copy; no hidden controls; no overlap with cutouts/safe areas.
- Narrative beats remain **single-line** now, expandable/modular later.
- Future penalty system remains deferred; maintain player-friendly/no-punishment-first posture for novice users.
