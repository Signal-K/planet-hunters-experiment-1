# Landnam game-wide design spec (SSL-517)

Status: DRAFT for Liam's review. Direction approved by Liam on 11 Oct 2026. Docs only: no app code changes ship with this file.

Scope: one visual system for the Earth Base, the mission board and the Takeon surface scenes, on web (`web/`) and native (`native/`), so the three read as one world.

Source note: the three reference images named in the brief (`orbit-review/design-refs/base-kit-v6.jpg`, `mission-board-v3.jpg`, `base-views.jpg`) did not exist at those paths when this was written, so they were not viewed. Everything below comes from the written direction plus the current repo. Every value marked `proposed` is a starting point to tune against the images, not a measurement from them.

Precedence: where this spec conflicts with `AGENTS.md` visual rules (see Open questions 1 and 2), `AGENTS.md` stands until Liam confirms.

## 1. Principles

1. Modular layers only. No whole-scene background image anywhere. Every scene is stacked layers (section 4) drawn by one pipeline with one camera, one palette and one outline weight.
2. One world. Base, mission board and Takeon share the layer stack, palette tokens, time-of-day grade and parallax rules. A building seen on the base is the same asset when seen on the mission board horizon.
3. Slightly realistic, traditional. Hard-edged angular forms, panel seams, believable machinery. No cartoon wobble, no glow-heavy sci-fi UI.
4. Everything animated (section 11), always with a reduced-motion fallback.
5. Customisation is placement, not construction: premade buildings and decorations, recolour, move, wire. No from-scratch building.
6. Not allowed anywhere: people walking, planets in the sky, "Earth HQ" naming, emoji in UI, em dashes in copy, silos above ground.

## 2. Palette tokens

Existing tokens (`web/app/globals.css`, `--ln-bp-*`, `--ln-shell`, `--ln-text*`) stay for UI chrome. The world layers add a `--ln-world-*` set, defined once in `globals.css` and mirrored in `native/App/Theme.swift`. No hardcoded hex in components. All values `proposed`.

### 2.1 Structure materials (base kit, daytime reference grade)

| Token | Value | Use |
|---|---|---|
| `--ln-world-hull` | `#ece8df` | warm white panelled hull, main face |
| `--ln-world-hull-shade` | `#c9c4b8` | shaded face and panel recess |
| `--ln-world-hull-lit` | `#faf7f0` | top edge and lit face |
| `--ln-world-seam` | `#8d897f` | panel seams, rivet rows, pipe runs |
| `--ln-world-trim-blue` | `#2f6fa8` | primary trim, door frames, gantry stripes |
| `--ln-world-trim-teal` | `#2a9aa3` | secondary trim, vents, status strips |
| `--ln-world-glass` | `#9fd6e4` | dome and window glass (alpha 0.55 over interior) |
| `--ln-world-accent` | `#d9733a` | orange, tiny: hazard stripe, one beacon, one pipe cap per building |
| `--ln-world-outline` | `#16293b` | all structure outlines (navy) |

Orange budget: at most 3% of a structure's visible area and at most one orange element per building. It is a detail colour, not a hue the scene is built on.

### 2.2 Ground and landscape (industrial and natural mix)

| Token | Value | Use |
|---|---|---|
| `--ln-world-soil` | `#8a7a64` | natural verge, dirt |
| `--ln-world-rock` | `#7c8088` | outcrops, cliff faces |
| `--ln-world-concrete` | `#b9b7b0` | pads, aprons, roads |
| `--ln-world-asphalt` | `#4b4f57` | service road |
| `--ln-world-grass` | `#7f9a68` | natural verge |
| `--ln-world-tree` | `#4f6f52` | treeline |
| `--ln-world-underground` | `#4a3f38` | subsurface soil base |
| `--ln-world-underground-rock` | `#3a3835` | unmined stone behind cutaway |

### 2.3 Sky and time-of-day grades

`useTimeOfDay` (`web/lib/hooks/useTimeOfDay.ts`) already gives `night | dawn | day | dusk`. Each phase is a sky gradient plus a multiplicative grade applied to every layer, so one asset set covers all phases.

| Phase | Sky top | Sky horizon | Layer grade |
|---|---|---|---|
| day | `#7fb6e6` | `#dcecf5` | none |
| dawn | `#6d6fb0` | `#f1c6b4` | warm, 0.9 brightness |
| dusk (mission board default) | `#2a2766` indigo | `#b3398f` magenta, via `#6b3fa0` violet | cool violet multiply, 0.75 brightness |
| night | `#0f1636` | `#2a2766` | blue multiply, 0.55 brightness, window and beacon emissives stay full |

The mission board is locked to the dusk grade regardless of local time. The base follows local time. Takeon follows the target body's own light, using the same grade maths.

### 2.4 UI chrome on the world

Contract card, dock and sheets use the existing blueprint chrome (`--ln-bp-paper`, `--ln-bp-ink`, `--ln-bp-line-strong`) with the navy outline. Text colours keep `--ln-text*`. Amber stays reserved for tiny payout emphasis only.

## 3. Outline and shadow rules

- Structures: 2 px navy outline (`--ln-world-outline`) at the 402 pt authoring width, scaled by the scene factor `k` (as `BaseLayout.k`, native, and `TerrainScene`, web). Never thinner than 1.5 px device-independent.
- Props (rocks, shrubs, pipes, decorations): 1.5 px outline, same colour.
- Landscape bands (far mountains, hills, treeline): no outline. Atmospheric haze replaces it, increasing with depth (`TerrainScene.haze(depth:)` already does this).
- Facet shading: two tones per face (`hull` and `hull-shade`) plus a `hull-lit` top edge. No gradients inside a face.
- Light direction: top-left. Cast shadows fall right and down at a fixed 30 degree angle, flat colour `rgba(22,41,59,0.22)`, never blurred. Shadow length scales with building height, so the launch gantry throws the longest shadow.
- Contact shadow: every prop and structure gets a 6 px flat ellipse at its base.
- UI offset shadow: panels use `3px 3px 0 var(--ln-bp-line-strong)` (existing).

## 4. Layer manifest

All layers are bands or sprites in one stack, composed by `TerrainScene` (`web/components/game/hub/TerrainScene.tsx`, compositions in `web/lib/scene/compositions.ts`, kit in `web/lib/scene/terrain-kit.ts`) on web and `TerrainScene` in `native/App/Terrain.swift` (bands from `native/App/Biome.swift`) on native. The existing mountains biome files in `docs/design/biomes/manifest.json` are the shipped baseline; sizes below are those 2x files, kept so the manifest stays authoritative.

Parallax depth is the fraction of the ground layer's horizontal scroll (1.0). In static base views the parallax comes from a slow camera drift (section 11), on mission and Takeon scenes from real camera movement.

| # | Layer | Content | Size (px, 2x) | Tiling | Parallax | Notes |
|---|---|---|---|---|---|---|
| 1 | sky | gradient plus stars (night) and 2 to 3 cloud sprites. No planets, no moon disc. | gradient, clouds 600x160 | clouds wrap horizontally | 0.02 (clouds 0.04) | grade from section 2.3 |
| 2 | far mountains | `layer-far` | 2332x368 | seamless horizontal, blend zone verified in manifest | 0.10 | heaviest haze |
| 3 | near hills | `layer-hills` | 2344x350 | seamless horizontal | 0.25 | mountains biome only; other biomes skip |
| 4 | treeline | `layer-treeline` | 2196x422 | seamless horizontal | 0.40 | |
| 5 | distant facilities | small kit buildings at 35% scale, no detail pass | per sprite | placed, not tiled | 0.50 | `facilities-far` composition entry |
| 6 | ground | `layer-ground` verge, road, verge | 2036x922 (mountains), up to 2254x956 | seamless horizontal | 1.00 | `roadFraction` 0.30 pins the road centre line |
| 7 | props | rocks (`rock-1..5`), shrubs (`shrub-1..2`), pipes, crates, fences | 186 to 650 px wide | placed, anchored at bottom-contact point | 0.70 behind ground edge, 1.0 on it | footprints excluded around structures and dock |
| 8 | structures | base kit buildings, launch pad, mission-board site markers | per size class (section 6) | placed on plots | 1.00 | the interactive layer |
| 9 | foreground | near rocks, grass tufts, cables, fence posts, edge vignette | 300 to 700 px | placed | 1.15 | never overlaps dock or tap targets |

Rules:
- Layer order is fixed. A screen may omit layers but never reorder them.
- Every band gets a flat-colour fallback (its top-edge average) so a missing asset shows a coloured strip, not a hole.
- Other biomes (`desert`, `tundra`, `coast`) supply layers 2 and 6 only today; layers 3, 4, 7 are optional per biome.
- Structures and the dock never sit over rock: terrain outcrops touching an exclusion rect are dropped (`TerrainScene.frames`).
- Ground line position is a single variable per screen (`--hub-ground` on web, `BaseLayout.ground` on native) and DOM labels hang off it.

## 5. Takeon terrain as the ground layer

Takeon (`web/components/takeon/TakeOnMount.tsx`, native seam `TakeonKit/TakeonEngine.swift`) renders full-screen isometric, slightly blocky voxel scenes. To read as the same world as the base and mission board:

1. Shared camera contract. Takeon exposes its camera (yaw, pitch, zoom, pan) to the host. The base and mission board use the same projection for layers 6 to 9 when rendered "in Takeon space": a 2:1 dimetric ground plane. The side-on base kit is the same projection with pitch locked to 0 for structures, ground band drawn as a flat strip. Switching from base to Takeon is a camera tween (pitch 0 to isometric, 600 ms), not a scene cut.
2. Ground handover. In Takeon, layer 6 is the voxel terrain surface itself. Its top-face colours are drawn from `--ln-world-soil`, `--ln-world-rock`, `--ln-world-grass` and `--ln-world-concrete` (biome-selected), and side faces from the `*-shade` variants, so the voxel top face and the base's ground band are the same material colours.
3. Voxel block size is chosen so one block equals one base plot-grid cell, so a building placed on the base and the same building footprint in Takeon agree.
4. Layers 1 to 5 (sky, far mountains, hills, treeline, distant facilities) are drawn behind the Takeon canvas as the same bands, scrolling by camera pan at their parallax factors. The Takeon canvas is transparent above the terrain horizon.
5. Layers 7 to 9 render over the voxel terrain with the same outline and shadow rules (section 3); voxel edges get the 1.5 px navy outline so blocky terrain and outlined structures match.
6. Grade. The same phase grade (section 2.3) multiplies the Takeon canvas. For non-Earth targets, the target's biome supplies the ground palette; the sky grade still applies and no planet is drawn in the sky.
7. Shared state. Scene lighting direction (top-left), shadow angle and haze depth are constants passed into the Takeon mount; Takeon must not set its own.

## 6. Building module kit and size classes

Look: side-on, angular, modular, about 40% No Man's Sky: warm white panelled hulls, visible seams, pipes and vents, blue and teal trim, little orange, a couple of glass domes. Buildings are premade modules; the player chooses, places, recolours and wires them.

Size classes, heights in plot-grid units (one unit = one Takeon block, section 5). Widths follow the existing `BUILDING_W` keys in `web/lib/hub-building-defs.ts` (reference widths at 402 pt: launchpad 105, refinery 84, deep-space-telescope 86, astronaut-academy 88, command 84, surface-silo 62, default 78).

| Class | Footprint (w x h units) | Examples | Look cue |
|---|---|---|---|
| XS decoration | 1 x 1 | antenna, vent stack, crate stack, beacon, solar panel | single colour accent allowed |
| S utility | 2 x 2 | pump house, generator, comms mast base | flat roof, one vent |
| M facility | 4 x 3 | refinery, academy, command, deep-space telescope housing | pipe run plus one glass dome on at most two of them |
| L hall | 6 x 4 | Hangar, Exchange (real building, stays; opens Market) | wide panelled hall, large door, trim band |
| XL launch complex | 12 x 9 plus gantry to 14 high | Launchpad | very large pad, concrete apron, full-height gantry tower with hazard stripe, fuel pipes, flame trench |

Rules:
- Clear size hierarchy: each class is visibly about 1.5 to 2 times the one below on screen. The Launchpad is the largest object in the base at all breakpoints.
- Silos are underground only (section 7). No above-ground silo sprite exists; the `surface-silo` key in `hub-building-defs.ts` must be retired or re-skinned as the lift-shaft cap (Open question 5).
- Each module ships: 4 recolour regions (hull, trim A, trim B, accent), a wiring port set (section 8), a construction stage strip, and an idle animation (section 11).
- Recolour changes only `hull`, `trim-blue`, `trim-teal`, `accent` slots, from a fixed swatch list per slot (8 swatches), never a free colour picker. Outline and seam colours never change.
- Decorations are free-placed on the grid; buildings snap to plots on the apron between road and dock (`BaseLayout.placedGroundY`).
- The Exchange keeps its name and its role as the door to the Market. No "HQ" naming for any building.

## 7. Underground progression states

Rendered as a cutaway of the same ground (side-on), reached from the surface lift shaft. Maps to `HubSubsurfaceView` (`web/components/game/hub/HubSubsurfaceView.tsx`, `hub-subsurface` screen) and `SUBSURFACE_ROOMS` in `web/lib/data/subsurface.ts`.

| State | What the player sees | Entry condition |
|---|---|---|
| 0 Sealed | Surface only. Lift shaft cap on the apron, closed. | start |
| 1 Shaft | Shaft drawn down through soil, lift car, empty bedrock-grey void around it. No rooms, no cells. | first visit / shaft unlocked |
| 2 Empty cutaway | A grid of unmined stone cells (`--ln-world-underground-rock`) beside the shaft. Nothing built. | subsurface opened |
| 3 Mining out | Player taps a cell to mine it; cell animates to excavated void. Cost per cell uses the excavation cost shape (`SUBSURFACE_EXCAVATE_COST`: francs plus minerals). Excavated cells show soil-dark void with support struts. | cells purchased |
| 4 Space ready | A contiguous excavated region of the required size (room footprint) highlights as a valid placement site. | region large enough |
| 5 Room placed | Premade room module fills the region: Mineral Vault, Deep Mineral Vault, Parts Stores (current `SUBSURFACE_ROOMS`), or a silo. Wired to the shaft by a corridor. | room purchased |
| 6 Operating | Room live: inventory read-out, idle animation, wiring lit. | room built |

Rules:
- Underground starts empty. No pre-built rooms, no pre-excavated area.
- Silos exist only here, as a vertical module in the lift shaft footprint with a visible lift.
- A room cannot be placed on unexcavated cells. Excavation and placement are separate purchases (matches the current "excavate, then build each room" rule).
- Cutaway uses the same outline, shadow and palette rules as the surface; ground colour is `--ln-world-underground` with `--ln-world-underground-rock` for unmined stone.

## 8. Edit mode (customisation)

Entered by `Build` in the dock (`hub-build-btn`, `setEditMode` in `HubScreen.tsx`). Exited by tapping `Build` again or the Done chip.

Tools (a single toolbar, bottom of screen, above the dock; 44 px targets minimum):

| Control | Action |
|---|---|
| Place | opens a shelf of premade buildings and decorations, grouped by size class. Drag onto a legal plot or grid cell; ghost shows validity (outline navy valid, `--ln-bp-pink` invalid). |
| Move | drag a placed item; snaps to plot or grid; invalid drops return to origin with a settle animation. |
| Recolour | select an item, choose a slot (hull, trim A, trim B, accent) then a swatch (8 per slot). Live preview. |
| Wire | select a port on one module, drag to a port on another. Wires are flat 2 px navy-edged cables with a teal power core that animates when live. Ports are typed (power, data, pipe); only matching types connect. |
| Rotate/flip | horizontal flip only (side-on kit has no rotation). |
| Store | return an item to inventory. Buildings with live contents ask for confirmation. |
| Bird's-eye | toggle switching the base to a top-down view (below). |

Bird's-eye toggle:
- A single toggle chip in the edit toolbar, also available outside edit mode in the top-right pill.
- The base re-projects from side-on to a top-down plan of the same plots, camera tween 500 ms. Building roofs are the same modules seen from above (roof art per module). Layers 1 to 5 fade out; ground, props, structures remain.
- Wiring and plot placement are easiest here; recolour and move work in both views.
- Underground bird's-eye is the cell grid from section 7.

Offline-first: every edit writes through the SSL-321 outbox; no direct client writes.

Accessibility: every edit action has a non-drag path (tap item, tap destination plot). Wire creation supports tap port, tap port.

## 9. Panel components

Contract card (mission board):
- One compact card, navy 2 px outline, `--ln-bp-paper` fill, 3 px offset shadow. Max width 280 pt, anchored lower-left in landscape and bottom-centre above the dock in portrait.
- Minimal text: client name, one-line objective, payout (the only amber), one CTA. Everything else is reachable on tap.
- The whole landscape stays visible; the card never covers more than 25% of viewport height in portrait or 35% of width in landscape.

Existing reusable panels (keep, do not fork): `web/components/ui/Panel.tsx`, `StatCard.tsx`, `StatusPill.tsx`, `HUDStrip.tsx`, `TopBar.tsx`, `ProgressBar.tsx`, `web/components/game/ScenePanel.tsx`. New world-aware panels (item shelf, swatch picker, wire port chip, plot label) build on `ScenePanel` and use the same outline/shadow.

Dock: exactly three controls: `« »` (switch operation), `Build`, `Hub`. Nothing else. Defined in `shared/layout/base-hud-zones.json` (`bottom-nav` tiles), read by both web (`DockPrimaryBtn` in `HubScreen.tsx`) and native (`HUDZones`, `BaseLayout`).

Plot labels: name pill under each structure, 14 pt text, uppercase with letter-spacing.

## 10. Responsive rules

Verify at 390x844 (phone portrait), 926x428 (phone landscape), 1440x900 (desktop), checking real `innerWidth`.

- Authoring width 402 pt; scale factor `k = clamp(width/402, 0.8, height/874*1.25+0.6)` (as `BaseLayout.k`).
- Body and map text at least 14 px; tap targets at least 44 px; 8 pt spacing rhythm.
- Layout is derived from `shared/layout/base-hud-zones.json`; both platforms read the same file.
- Portrait: sky and far layers get more height (shorter ground), structures scale 1x with `structureScale` from the zone file, contract card sits above the dock, placed items get an apron above the dock.
- Landscape (phone): ground band occupies the lower 35%; structures spaced across the width; contract card left; dock centred bottom.
- Desktop: same composition as landscape; layers extend horizontally with tiling, structures stay at authored scale up to 1.6k px width then add distant facilities and props rather than scaling up.
- The Launchpad remains the largest object and fully visible in all three; gantry may clip off the top only on short landscape (below 360 px height) by lowering its upper section, never the pad.
- Safe areas: dock and toolbars respect safe-area insets (web `env(safe-area-inset-*)`, native `insets`).
- Safari: no layout reliance on `100vh`; use `dvh` or measured height. Test in Safari and the iOS Simulator.
- Reduced motion: replace all looping animation with a single static frame, tweens with a 120 ms cross-fade.

## 11. Animation list

All loops pause when the tab is hidden or the screen is not active. Reduced motion: section 10.

### Ambient loops

| Element | Motion | Timing |
|---|---|---|
| Clouds | slow horizontal drift | 90 to 140 s per wrap, ease linear |
| Stars (night) | twinkle, 1 in 6 stars at a time | 2.5 to 4 s per twinkle, random phase |
| Camera drift (static views) | +/- 6 px horizontal sway driving parallax | 24 s sine loop |
| Far mountain haze | brightness breathe 0.97 to 1.0 | 12 s sine |
| Treeline | leaf shimmer, 1 to 2 px sway | 6 s sine, per-tuft phase |
| Grass tufts and shrubs | sway | 3.5 to 5 s sine |
| Windows and beacons | beacon blink; window flicker (night only) | blink 1.2 s on / 1.2 s off; flicker 0.15 s random every 8 to 20 s |
| Vents and chimneys | steam puff rising and fading | 3 s puff every 4 to 7 s |
| Glass domes | slow specular sweep | 6 s every 10 s |
| Pipes | teal pulse travelling along run | 2.4 s loop |
| Radar / dish | rotation | 12 s per revolution |
| Wind turbine (decoration) | rotation | 4 s per revolution |
| Launchpad gantry | warning light blink; steam venting at the base | blink 1 s; vent every 6 s |
| Hangar door | idle ajar crack of light breathing | 5 s sine |
| Exchange | ticker strip scroll | 20 s per wrap |
| Road vehicles (no people) | rover crossing at ground band (`RoadRover`) | 30 to 45 s crossing, every 20 to 40 s |
| Dust motes | `AmbientMotes` drift | 8 to 14 s per mote |
| Underground | dust falling in cells, lift car idle bob, wiring pulse | dust 5 s; bob 3 s; pulse 2.4 s |

### Event and transition animations

| Event | Motion | Timing |
|---|---|---|
| Building placed | drop from 24 px above, squash 4%, dust puff | 280 ms drop, 120 ms settle, 400 ms puff |
| Construction in progress | scaffold stage strip step through frames, crane arm swing | stage advance per `buildStartedAt` progress; crane 4 s loop |
| Construction complete | scaffold fades, beacon flash x2, trim lights sweep | 600 ms fade, 2 x 250 ms flash |
| Item picked up (move) | lift 8 px, shadow stretches | 120 ms |
| Item dropped valid | settle with 2 px bounce | 160 ms |
| Item dropped invalid | shake then return | 200 ms shake, 240 ms return |
| Recolour | cross-fade between swatches | 180 ms |
| Wire drag | wire follows pointer, snaps on valid port with a spark | snap 100 ms, spark 200 ms |
| Wire live | core pulse starts along cable | 2.4 s loop |
| Bird's-eye toggle | camera tween side-on to top-down, far layers fade | 500 ms ease-in-out |
| Side-on to Takeon | camera tween pitch 0 to isometric, ground morphs to voxel | 600 ms |
| Screen change | cross-fade of structures layer only; sky, mountains and ground persist | 240 ms (existing `SceneTransition` semantics) |
| Contract card in | rise 16 px and fade | 260 ms ease-out |
| Contract card out | fade and drop 8 px | 160 ms |
| Mission board site marker | beacon pulse on the selected site | 1.6 s loop |
| Launch | pad countdown lights, gantry arm retract, smoke, ascent (existing `LaunchSequenceCanvas`) | gantry retract 1.2 s, ascent per sequence |
| Underground: cell mined | crack, debris fall, cell becomes void | 220 ms crack, 360 ms debris |
| Underground: room placed | drop in with lights coming on in order | 300 ms drop, 120 ms per light |
| Underground: lift travel | car slides between surface and level | 900 ms ease-in-out |
| Phase change (day to dusk) | grade and sky cross-fade | 4 s |
| Dock tap | press scale to 0.96 | 80 ms down, 120 ms up |

## 12. Per-screen mapping

Web screens are routed by `web/components/game/GameScreenRouter.tsx`; screen components live in `web/components/game/screens/`. Native screens live in `native/App/Screens/`.

| Screen | Web | Native | Layers and notes |
|---|---|---|---|
| Earth Base (hub) | `HubScreen.tsx`, `hub/HubWorldBackground.tsx`, `hub/TerrainScene.tsx`, `hub/EarthBaseModules.tsx`, `hub/Building.tsx`, `hub/AmbientMotes.tsx`, `hub/RoadRover.tsx` | `HubScreen.swift`, `BaseLayout.swift`, `Terrain.swift`, `Biome.swift` | Layers 1 to 9, base kit, edit mode, bird's-eye. Remove the sky planet: `HubWorldBackground.PlanetBackdrop` (web) and `Planet` and `showsPlanet` in `Terrain.swift` (native) violate "no planets in sky". Dock: `« »`, Build, Hub. |
| Subsurface | `hub/HubSubsurfaceView.tsx`, `hub/SoilCrossSection.tsx` (`hub-subsurface`) | no dedicated file today (planned, via `HubScreen.swift`) | section 7 states |
| Build / place | `BuildPlaceScreen.tsx`, `FreeOpsBuildScreen.tsx` | `BuildScreen.swift` | becomes the edit-mode shelf plus placement flow (section 8); no from-scratch building |
| Mission board | `MissionSetupRoutes.tsx` (`missions`, `targets`, `rocket-buy`, `fab`), `previews/MissionFlowPreview.tsx` | `CoreLoop.swift` (`MissionsScreen`), `RouteMap.swift` | dusk grade, whole landscape, one contract card |
| Launchpad | `LaunchpadScreen.tsx`, `LaunchSequenceCanvas.tsx` | `LaunchReview.swift`, `Scenes/LaunchScene.swift`, `Scenes/LaunchAtlas.swift` | uses the XL launch complex module |
| Hangar | `HangarScreen.tsx` | `CoreLoop.swift` (`LaunchScreen`, routed from `.hangar` in `RootView.swift`) | L hall module interior is a separate scene; exterior uses the base kit |
| Market (Exchange) | `MarketScreen.tsx` | `CoreLoop.swift` (`MarketScreen`) | Exchange stays a real building on the base |
| Refinery | `RefineryScreen.tsx` | `RefineryScreen.swift` | M facility |
| Takeon surface ops | `SurfaceOpsScreen.tsx`, `takeon/TakeOnMount.tsx`, `takeon/SandboxFieldControls.tsx` | `SurfaceOpsScreen.swift`, `RoverFieldScreen.swift`, `Scenes/MiningScene.swift`, `TakeonKit/TakeonEngine.swift` | section 5 ground handover |
| Mining, rover, delivery, landing, debrief | `MiningScreen.tsx`, `RoverMiningScreen.tsx`, `DeliveryScreen.tsx`, `LandingScreen.tsx`, `DebriefScreen.tsx` | `FlightScreens.swift`, `Scenes/FlightScene.swift`, `Scenes/MiningScene.swift` | shared layer stack with Takeon grade; flight and transit scenes are space views and may omit layers 2 to 6 |
| Instrument hub, control station | `InstrumentHubScreen.tsx`, `control-station/ControlStationBoard.tsx` | `ControlStationScreen.swift`, `InstrumentViewport.swift` | instrument-room interiors; use the panel and outline rules, not the layer stack |
| Academy, skills, ledger, history | `AcademyScreen.tsx`, `SkillTreeScreen.tsx`, `NarrativeLedgerScreen.tsx`, `MissionHistoryScreen.tsx` | `AcademyScreen.swift`, `SkillTreeScreen.swift`, `ArchiveScreen.swift` | reference/menu surfaces: cards allowed, palette and outline rules apply |
| HUD zones | `lib/screen-layouts.ts`, `lib/ui-zones.ts` | `HUDZones.swift` | both read `shared/layout/base-hud-zones.json` |

Gaps to implement later (separate tickets, not part of this docs change): new `--ln-world-*` tokens, module kit art, edit-mode UI, bird's-eye view, underground cell grid, planet removal, Takeon camera/ground handover.

## 13. Open questions for Liam

1. Dusk mission board vs the visual rules. `AGENTS.md` says light blueprint style, no dark-by-default surface, and no orange or purple hue. The approved mission board is a deep dusk palette (indigo, violet, magenta) and the base kit uses a little orange. Confirm this world-art exception applies to scene layers only, with all UI chrome staying light blueprint, and that the `AGENTS.md` visual rules and the `:root` comment in `globals.css` should be updated to say so. This spec assumes yes.
2. `useTimeOfDay` previously made the base follow local time with ops screens fixed. Should the base keep following local time (spec assumption), or fix one grade per screen?
3. Reference images: the three files were not at the stated paths. Where are they? Section 6 widths, colours and the contract card dimensions should be tuned against them before art production.
4. Biomes (`mountains`, `desert`, `tundra`, `coast`): is `mountains` the only biome carrying hills and treeline layers for now, and when does the biome picker (SSL-502) ship?
5. `surface-silo` exists as a key in `hub-building-defs.ts` and in the surface build flow. Silos are underground only. Retire the surface key and migrate saves, or keep it as the lift-shaft cap?
6. Wiring semantics: purely cosmetic, or does it gate function (power to the refinery, data to the telescope)? The spec draws typed ports either way. Gameplay wiring needs a mechanics decision recorded in ZenNotes.
7. Bird's-eye: available outside edit mode, or edit-mode only?
8. Recolour swatches: 8 per slot as proposed, or unlocked by progression or purchase?
9. Takeon grid unit: is one voxel block per base plot cell acceptable to the Takeon engine (vendored JS and the future Swift port), or does Takeon need a scale constant?
10. Native subsurface: no dedicated native screen exists today. Should the native cutaway be built at parity in Cycle 4, or follow web?
11. Road vehicles: the rover on the road is a vehicle, not a person. Confirm that is acceptable under "no people walking".
