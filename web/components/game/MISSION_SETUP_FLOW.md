# Mission setup clean-slate handoff

The previous Mission Dispatch, Target Picker, Rocket Purchase, and Preflight component set was removed under KES-347. KES-348 replaces it with one continuous command-blueprint console in `MissionSetupRoutes.tsx`.

Do not restore or visually copy the deleted shell, relay card, map detail shell, rocket inspection bay, right-side summary panel, or preflight clearance panel. Do not treat the remaining legacy selectors in `app/globals.css` as a specification; they are unreferenced historical CSS and should be deleted as the replacement component set lands.

## Runtime flow

All setup states use the canonical `/game/missions` URL. The internal `GameState.screen` value selects the current step:

1. `missions`
   - Input: catalog missions, clients, player progression, scene scope, crew, funds.
   - Action: `game.onPickMission(missionId)`.
   - Normal result: `targets`.
   - Fixed-target mission result: `rocket-buy`, or `fab` when the matching rocket is already pending.
2. `targets`
   - Input: selected mission plus `feasibleTargetsFor(...)`.
   - Action: `game.onPickTarget(targetId)`.
   - Result: `rocket-buy`, or `fab` when a rocket is already pending.
3. `rocket-buy`
   - Input: selected mission and target, unlocked `ROCKET_MODELS`, Franc balance, optional Surface Silo inventory/fabricated parts.
   - Company rocket action: `game.onPurchaseRocket(rocketId)`.
   - Silo actions: `game.onFabricateRocketPart(rocketId, componentId)` and `game.onAssembleFabricatedRocket(rocketId)`.
   - Result: `fab`; the chosen rocket becomes `player.pendingLaunch`.
4. `fab`
   - Input: mission, target, configured rocket, parts, skills, and crew readiness.
   - Gate: `validateBuild(...)` plus `crewRequirementStatus(...)` when crew is required.
   - Action: request the launch sequence, then call `game.onLaunch()` when its animation completes.
   - Result: `transit` with an active mission run.

## State ownership

- Flow mutation lives in `lib/contexts/useGameLoop.ts`.
- Rocket purchase/fabrication mutation lives in `lib/systems/EconomySystem.ts`.
- Mission, target, rocket, and pending-launch identifiers live in `GameState` and persist through the existing game-state sync path.
- Tutorial coach selection and rendering live above this boundary in `GameScreenRouter.tsx` and `GameApp.tsx`.
- URL canonicalization lives in `lib/game-route.ts`; individual setup routes are intentionally not exposed.
- `LaunchSequenceCanvas` remains downstream of the setup scaffold and calls `game.onLaunch()` only after completion.

## Replacement boundary

The replacement should consume the existing `MissionSetupRoutesProps` contract or introduce one new equivalent boundary. It should not move business rules into presentation components. The setup flow should remain one component family, one route, one stable scene/container, and one continuous tutorial surface.

Direct visual constraints for the replacement:

- mission setup is an operations surface and uses the dark command-deck theme;
- no white document page, generic text list, or card-grid treatment for a primary game action;
- use actual game identity and telemetry: client marks, mineral glyphs, orbit bodies, target reticles, rocket renders, and instrument icons;
- keep a stable full-stage blueprint frame across contract, target, vehicle, and clearance steps;
- the solar-system map and rocket stage use the same full stage bounds;
- the selected rocket is large, visible, and centred in the unobscured stage;
- avoid default page or inspector scrolling at supported landscape sizes;
- preserve a compact command rail for secondary navigation and keep the primary action anchored to the illustrated scene.
