# Tutorial Spec

## Scope

Onboarding teaches Landnam as **establishing your own space agency** (SSL-332, decided 2026-09-28). It replaces the earlier three-mission ladder (M1 extraction, M2 Prospector bulk haul, M3 transport). Do not revive that ladder or older post-onboarding plans.

The training track is:

**Place Launchpad → Extraction → Transport → Build Storage Silo → Free Ops**

| Stage | What the player does | Completes when |
|---|---|---|
| Place Launchpad | Build the first structure | `launchpad` is placed |
| Extraction | Guided mission 1: accept a client contract, pick a target, fly the included Explorer, mine, return, debrief | `missionsDone` reaches 1 |
| Transport | Guided mission 2: a courier job (SSL-362) — the client's cargo is loaded on Earth, flown to their depot, unloaded, and the ship flies home. No mining; paid as a transport fee. Prospector is purchasable but not forced | `missionsDone` reaches 2 |
| Build Storage Silo | Place the Earth `surface-silo` (required) | silo is placed; this opens Free Ops |
| Free Ops | Pick an activity: Client work / Space telescope / Build refinery | — |

Mining, transport and construction are taught as separate agency activities: one stage each.

## Rules

- **Free Ops boundary.** `freeOperationsUnlocked` in `web/lib/systems/AgencyOnboardingSystem.ts`: both guided missions flown **and** a storage silo placed. `player.freeOperations` is derived from it on every load (`web/lib/game-state.ts`), on mission completion (`useGameLoop`) and on structure placement (`applyPlaceStructure`).
- **Existing players keep their unlocks.** Saves with `missionsDone >= 3` reached Free Ops under the old ladder and keep it without a silo (`LEGACY_FREE_OPS_MISSIONS_DONE`).
- **Silo unlock.** The Surface Silo's unlock trigger is `onboarding-missions`: it becomes buildable once both guided missions are flown, before Free Ops.
- **Handoff.** Placing the silo raises the `tutorial-complete` popup once. The sheet shows the finished track and the three Free Ops activities:
  - Client work → mission board
  - Space telescope → Launchpad (where the transit telescope launches) until one is in orbit, then the Instrument Hub
  - Build refinery → Build placement until a refinery exists, then the Refinery
- **Replayable.** Menu → Agency Training (Free Ops only) reopens the same sheet in review mode: each stage with a one-line summary of what it taught, plus the three activities. It never changes progress.
- **Courier jobs.** A mission with `loadedCargo` (the two Transport contracts, `lnm_transport_courier_vesta` and `lnm_transport_courier_eros`) targets the depot directly. `applyCourierLaunchCargo` loads the hold at launch and sets `headingToDelivery`, so the first arrival opens the delivery scene. Saves mid-run on the retired relay lessons (`lnm_m3_relay_*`) are returned to the Hub.
- Post-onboarding missions keep the old contract-fee tier (`FREE_OPS_MISSION_SEQUENCE = 4`), so the shorter onboarding does not change Free Ops pay.

## Coach steps

`web/lib/data/tutorial.ts`, selected by `trainingCoachSteps(agencyTrainingStage(player))`:

- `EXTRACTION_STEPS` (ids 0–8): place the Launchpad, open the mission board, pick a contract and target, review the Explorer, launch, mine.
- `TRANSPORT_STEPS` (ids 30–33): open contracts, the cargo delivery at vehicle selection, confirm the run, unload at the client depot.
- `STORAGE_STEPS` (ids 40–41): tap the Hub's "Build Storage Silo" card, then place the silo on an open plot.

While the player is waiting on the silo, the Hub shows a Storage Silo progression card and the mission board says to build the silo instead of showing an empty list.

## Presentation

`TutorialCoach` renders compact coach marks and manual cards from `web/lib/data/tutorial.ts`. `TutorialCompleteSheet` renders the Free Ops handoff and the training review.

## State

- `game.tutorial` is true for every player not yet in Free Ops (it is repaired back on if a save lost it).
- `game.doneSteps` tracks completed step IDs; skipping marks the current stage's steps done.
- `game.popup === 'tutorial-complete'` is the one-time handoff; `'agency-training'` is the menu review.
