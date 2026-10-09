# Native audit (SSL-499), 2026-10-09

Build: iOS simulator (iPhone 17 Pro, iOS 26) from branch `orbit/native-fix-1`. Screens were launched through the scene catalog (`-scene <id>`) and the real app entry. "before-*" PNGs sit next to this file; "after-*" show the fixes made in this branch.
Not reachable headless: tapping through the live loop (no UI driver in this environment), so control wiring below is from reading the code, not from tapping.

## What reproduces and what does not

| Claim | Result |
| --- | --- |
| No colour | Does not reproduce in this build. Tokens in `App/Theme.swift` resolve (blue, teal, mint, paper) and the base, transit, mining and rover screens render coloured. The menu screens (Build, Control Station, Refinery, Academy) are white cards on pale blue-grey with blue offset shadows: low colour by design (reference/menu surfaces), but light on the mint/teal accent. Not changed. |
| Buttons take over the screen | Reproduced, root cause found and fixed: `Panel` (`Theme.swift:~96`) applied padding, background and outline to each child of its content separately. Any Panel with several children (transit: label, bar, button) rendered one full-width card per child. Fixed by wrapping the content in one VStack. Before: `before-transit-phone.png`, after: `after-transit-live.png`. |
| HUD under the status bar | Reproduced on the real launch path, hidden by the catalog. `HubScreen` put `.ignoresSafeArea()` on the outside of its GeometryReader, so `safeAreaInsets` read 0. Francs chip and friends/settings pill sat under the clock and Dynamic Island, the dock under the home indicator. The catalog passes `safeAreaOverride`, which is why snapshots looked right (preset blind spot). Fixed. Before: `before-real-launch.png`, after: `after-real-launch.png`. |
| Mining scenes wrong | Partly reproduced. Routing is right (below). The laser scene (`App/Scenes/MiningScene.swift`) draws a ground terrain with a rover on it and ores floating in the sky: it mixes the rover and laser scenes. See task E. |
| Rover scenes don't make sense | Reproduced, see below. |
| Takeon not used | True. `native/TakeonKit` is a 35-line protocol plus `NullTakeonEngine`; it is not a dependency in `native/project.yml` and nothing under `App/` imports it. Web hosts a vendored JS engine in `RoverMiningScreen`, `SurfaceOpsScreen`, `DeliveryScreen`, `TargetSphere`. There is no Swift port to wire to. |
| Controls don't work | Not reproduced by reading: base dock, friends, settings, subsurface hotspot, sky craft, ContractCard all call `store.go` or open sheets. Items that do nothing are listed below. |

## Mission to scene map (what analytics and tests hang on)

Core loop (`Systems/Loop.swift`, `RootView.swift`): hub -> missions -> targets/rocketBuy/fab/launchpad (`LaunchReviewScreen`) -> launch (`LaunchSequenceScreen`) -> transit (`TransitScreen`, `FlightScene`) -> `Loop.transitArrived` -> mining (`MiningScreen`, `MiningScene`, laser) or roverMining (`RoverFieldScreen`) -> return transit -> delivery (`DeliveryScreen`) when a client delivery leg exists -> debrief (`DebriefScreen`) -> hub.
Instrument flows: control station (`ControlStationScreen`) -> asteroid discovery, Saturn storm search, TESS discovery. Base: hub, build, refinery, academy, skills, missions, mission history, ledger, market, surface ops, hangar (`LaunchScreen`).

Rover vs laser: web decides by `mission.survey.onWorldVehicle == 'starter-rover'` (`MissionOperationRoutes.tsx:76`, plus the tutorial delivery case). Native decides by `mission.requires.drillTier == 0` (`Loop.swift:197`). Different rule, same either/or split; native has no `survey` field on `Mission`. Orbital/instrument payloads end on arrival in both.

## Screens walked (before-*.png)

hub-phone, launch-review-phone, launchpad-ops-phone, debrief-phone, control-station-phone, build-phone, academy-phone, surface-ops-phone, refinery-phone, skill-tree-phone, tess-discovery-phone, intro-phone, rover-field-phone, transit, mining-laser.

## Controls that do nothing or are partial

- `HubScreen.swift:88`: subsurface hotspot goes to `.hubSubsurface`, which `RootView` renders as the same base screen. Looks like a dead control.
- `HubScreen.swift:344` FriendsSheet: friends not ported (opens a stub sheet).
- `HubScreen.swift:168`: location list reads existing core data only (no combined list).
- `RootView.swift` `StubScreen` is the default for any screen without a case (`.galaxy` is routed; check others in `Screen.swift` that fall to the stub).
- `FlightScreens.swift` TransitScreen: button reads "IN FLIGHT" and is disabled until arrival (intended, not a bug).
- `FlightScreens.swift:153` `Button("Keep mining", role: .cancel) {}` is the dialog cancel, fine.

## Analytics

No PostHog client exists in `native/` (searched Swift, yml, md). No SDK was added. The map above is the analytics plan; proposed event names per scene: `scene_viewed {scene}`, `mission_started/phase_changed/completed {mission_id, phase}`, `control_used {scene, control}`.

## Later (not built)

Ambient music and sound effects are a TODO: base ambience, transit hum, laser fire, rover drive, drill, debrief sting.
