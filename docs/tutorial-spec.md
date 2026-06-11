# Tutorial Spec — M1-M3 Coach Marks

> Replaces the old Godot `TutorialController.gd` / `TutorialPersistence.gd` /
> `TutorialCoachOverlay.tscn` system, which no longer exists in this
> repository. The Next.js game uses a lightweight, coach-mark based tutorial
> driven by `web/lib/data.ts` (`TutorialStep`, `M1_STEPS`, `PROGRESSION_STEPS`)
> and rendered by `web/components/game/TutorialCoach.tsx`.

## Scope

Covers only the 3-mission MVP arc (M1 mine asteroid, M2 better rocket + more
minerals, M3 exoplanet visit / classification). There is:

- No Mission 4.
- No scanner station step (see `docs/structures/scanner-station.md`).
- No XP/level gating — progression is gated by `missionsDone` and
  `missionsRequired` on parts (see `web/lib/data.ts`).

## Steps

`M1_STEPS` walks the first mission end-to-end:

1. **Build a Launchpad** (`build` screen) — place the starter structure.
2. **Open a Mission** (`hub` screen) — open the radial menu, go to Missions.
3. **Lock a Contract** (`missions` screen) — accept a contractor mission.
4. **Choose a Destination** (`targets` screen) — pick a compatible target.
5. **Assemble the Rocket** (`fab` screen, manual) — review the suggested
   build.
6. **Launch** (`fab` screen) — confirm launch.
7. **Mine the Asteroid** (`mining` screen) — collect ore, then return.
8. **Debrief** (`debrief` screen) — sell cargo, collect contractor bonus.

`PROGRESSION_STEPS` extends `M1_STEPS` with one additional step used for the
M3 classification flow:

9. **Classify a TESS Lightcurve** (`classify` screen) — inspect the transit
   signal and submit a PLANET / NOT PLANET classification.

## Presentation

`TutorialCoach` renders two styles:

- **Compact pill** (default) — a small avatar + instruction bar anchored to
  the top or bottom of the screen, with a pulsing ring (`spot`) highlighting
  the relevant UI element. Dismissible via "Skip".
- **Manual card** (`step.manual === true`) — a full card with "Got it"
  confirmation, used for steps that don't have a single tappable target (e.g.
  reviewing the suggested rocket build).

Progress is shown as a row of dots (`dots`), one per step, colored by
completed / current / upcoming state.

## State

- `game.tutorial` (boolean) — whether the tutorial is active.
- `game.doneSteps` (`Record<number, boolean>`) — completed step IDs, used to
  find the next step for the current screen via
  `coachSteps.find(step => step.screen === game.screen && !game.doneSteps[step.id])`
  in `web/components/game/GameApp.tsx`.

## Adding a step

1. Add a `TutorialStep` entry to `M1_STEPS` or `PROGRESSION_STEPS` in
   `web/lib/data.ts` with a unique `id`, target `screen`, and either a
   `spot` (for the highlighted-element pill) or `manual: true` (for a
   standalone card).
2. No additional wiring is needed — `GameApp.tsx` derives the active step
   from `game.screen` and `game.doneSteps` automatically.
