# Tutorial Spec

## Scope

Current onboarding covers M1 and M2 only.

- M1 teaches launchpad placement, mission selection, target selection, preflight, mining, and debrief.
- M2 teaches the Prospector purchase flow for a larger single-use vessel.
- M3 is not yet fully described. Do not implement or document M3 from older plans.

Earlier onboarding and post-onboarding plans are intentionally not part of this spec.

## Onboarding v2 — establish your space agency (SSL-332, in progress)

Onboarding is being reframed from "three mining missions" to founding an agency. The training track is:

**Place Launchpad → Extraction → Transport → Build Storage Silo → Free Ops**

Free Ops then offers **Client work / Space telescope / Build refinery** immediately. Existing players keep all unlocks, and the training stays replayable.

Current state (first slice):

- `web/lib/systems/AgencyOnboardingSystem.ts` derives the player's training stage from existing state. Extraction covers the mine-and-return onboarding missions, Transport is the final two-stop haul mission (KES-313), and Storage is complete once a `surface-silo` is placed.
- The stage model gates nothing. `player.freeOperations` is still derived from `missionsDone` in `web/lib/game-state.ts`, so the Storage stage is a recommended next beat, not a lock.
- The Guided Operations handoff sheet (`TutorialCompleteSheet`) shows the track, with Storage Silo as the next step.

Not yet done: coach steps per stage, the Build Storage Silo guided step, the three-activity Free Ops menu, replaying training, and any change to the mission count before Free Ops.

## Steps

`M1_STEPS` walks the first mission end-to-end:

1. Build a Launchpad.
2. Open Missions.
3. Pick the M1 contract.
4. Choose a compatible target.
5. Review the prebuilt Explorer.
6. Launch.
7. Mine the required ore.
8. Debrief and sell cargo.

`M2_STEPS` covers the current M2 proposal:

1. Explain that M2 needs Prospector because Explorer cannot carry the required silicon.
2. Purchase Prospector in the rocket selection step before launch.

## Presentation

`TutorialCoach` renders compact coach marks and manual cards from `web/lib/data/tutorial.ts`.

## State

- `game.tutorial` tracks whether authored tutorial guidance is active.
- `game.doneSteps` tracks completed step IDs.
