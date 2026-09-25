# Tutorial Spec

## Scope

Current onboarding covers M1 and M2 only.

- M1 teaches launchpad placement, mission selection, target selection, preflight, mining, and debrief.
- M2 teaches the Prospector purchase flow for a larger single-use vessel.
- M3 is not yet fully described. Do not implement or document M3 from older plans.

Earlier onboarding and post-onboarding plans are intentionally not part of this spec.

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
