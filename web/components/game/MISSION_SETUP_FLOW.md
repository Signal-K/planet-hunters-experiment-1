# Mission setup clean-slate handoff

The previous Mission Dispatch, Target Picker, Rocket Purchase, and Preflight component set was removed under KES-347. KES-348 replaces it with one continuous Earth Base scene in `MissionSetupRoutes.tsx`.

Do not restore or visually copy the deleted shell, relay card, map detail shell, rocket inspection bay, right-side summary panel, or preflight clearance panel. Do not treat the remaining legacy selectors in `app/globals.css` as a specification; they are unreferenced historical CSS and should be deleted as the replacement component set lands.

## Runtime flow

All setup states use the canonical `/game/missions` URL. The internal `GameState.screen` value selects the current step:

1. `missions`
   - Input: catalog missions, clients, player progression, scene scope, crew, funds.
   - Action: `game.onPickMission(missionId)`.
   - Normal result: `targets`.
   - Fixed-target mission result: `rocket-buy`, or `fab` when a prepared vehicle is already assigned to that exact mission and target.
2. `targets`
   - Input: selected mission plus `feasibleTargetsFor(...)`.
   - Action: `game.onPickTarget(targetId)`.
   - Result: `rocket-buy`, or `fab` when a prepared vehicle is already assigned to that exact mission and target.
3. `rocket-buy`
   - Input: selected mission and target, compatible unlocked `ROCKET_MODELS`, and Franc balance.
   - Company rocket action: `game.onPurchaseRocket(rocketId)` charges the shipment once and creates a distinct physical vehicle in the Hangar.
   - A compatible vehicle assigned to another prepared mission is presented as an explicit move: `game.onMoveStagedRocket(vehicleId)` changes its assignment without another charge and releases its former preparation. `onPurchaseRocket` remains available to build another same-class vehicle without changing the former mission.
4. `fab`
   - Input: mission, target, configured rocket, parts, skills, crew readiness, and pending vehicle location.
   - Gate: `validateBuild(...)` plus `crewRequirementStatus(...)` when crew is required.
   - Action: `game.onTransferToLaunchpad()` moves a Hangar vehicle to the pad. Only then can the launch sequence call `game.onLaunch()`.
   - Result: `transit` with an active mission run.

## State ownership

- Flow mutation lives in `lib/contexts/useGameLoop.ts`.
- Rocket purchase/fabrication mutation lives in `lib/systems/EconomySystem.ts`.
- Mission, target, rocket, and the `player.stagedRockets` prepared-vehicle ledger live in `GameState` and persist through the existing game-state sync path. The old single pending fields mirror the currently inspected vehicle for legacy surfaces only.
- Tutorial coach selection and rendering live above this boundary in `GameScreenRouter.tsx` and `GameApp.tsx`.
- URL canonicalization lives in `lib/game-route.ts`; individual setup routes are intentionally not exposed.
- `LaunchSequenceCanvas` remains downstream of the setup scaffold and calls `game.onLaunch()` only after completion.

## Replacement boundary

The replacement should consume the existing `MissionSetupRoutesProps` contract or introduce one new equivalent boundary. It should not move business rules into presentation components. The setup flow should remain one component family, one route, one stable scene/container, and one continuous tutorial surface.

Direct visual constraints for the replacement:

- the colored Earth Base landscape remains visible behind every mission-setup state;
- no generic dark-grey/blue page, blueprint-page background, white document page, text list, or card-grid treatment for a primary game action;
- use actual game identity and telemetry: client marks, mineral glyphs, orbit bodies, target reticles, rocket renders, and instrument icons;
- use one and only one bordered stage container with identical bounds and coordinates across all four steps;
- contract selection is a one-item-at-a-time portfolio gallery that fills the entire stage, with previous and next arrows;
- the map fills the entire stage, highlights only targets that satisfy the mission minerals, range, cargo, and drill parameters, and states that filter in visible copy;
- the blueprint fills the entire stage and uses only a minimal schematic background, a visually distinct rocket render, its name, its room list, and rocket-switching controls when more than one compatible unlocked rocket exists;
- the review fills the entire stage as one composition, not as a collection of separate cards;
- do not add a second inspector, sidebar, tutorial column, or differently sized step wrapper inside or beside the stage;
- avoid default page or inspector scrolling at supported landscape sizes;
- the tutorial coach uses one fixed 320px width and one fixed top-left anchor across all four setup states and never changes stage geometry.
