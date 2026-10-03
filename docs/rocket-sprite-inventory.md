# Rocket sprite inventory — 3 Oct 2026

Inventory only. No new art. An artist can cut sprite sheets against the ids, sizes, and stage anchors below and drop the files onto the paths already in code.

Two art systems exist and they do not share a drawing:

1. **Exterior flight sprite.** One horizontal PNG per flyable model (`ship_sr1.png`, `ship_sr2.png`, both 480×180). Used everywhere the ship is seen in flight or as a side view.
2. **Launch stack.** Procedural Pixi `Graphics` in `web/lib/pixi/launchScene.ts`. `rocketImageSrc` is accepted and ignored. Booster and stage separation run on these shapes, not on the exterior PNG.

Room and catalog PNGs are interior / shop tiles. They are not the stages that separate.

## Flyable models

Legacy `sr1`–`sr5` strings resolve through `canonicalRocketId` and are not runtime ids.

| ID | Name | Locked | Exterior file | Source px | Where it renders | On-screen size |
| --- | --- | --- | --- | --- | --- | --- |
| `explorer` | Explorer | no | `/game/assets/ships/ship_sr1.png` | 480×180 | See render sites below | See render sites |
| `prospector` | Prospector | no | `/game/assets/ships/ship_sr2.png` | 480×180 | Same sites, chassis `hull-mk2` or `hull-mk3` | Same |
| `unannounced-3` | Unannounced | yes | `/parts/basic_hull_t1.png` | 480×480 | Hangar tease only. Not a flight sprite | Hangar card width 240 (square, so ~240 tall) |
| `unannounced-4` | Unannounced | yes | `/parts/basic_hull_t1.png` | 480×480 | Hangar tease | same |
| `unannounced-5` | Unannounced | yes | `/parts/basic_hull_t1.png` | 480×480 | Hangar tease | same |

Chassis → model (`rocketModelForConfig`): `hull-mk1` → explorer, `hull-mk2` and `hull-mk3` → prospector. Purchase loadouts (`rocketConfigForModel`): explorer is `hull-mk1` / `ion-a1` / `hand-drill`; prospector is `hull-mk2` / `fusion-b2` / `laser-t2`.

Cutaways (blueprint / interior grid, not the side view):

| Model | File | Source px |
| --- | --- | --- |
| explorer | `/game/assets/ships/containers/sr1_cutaway.png` | 1200×600 |
| prospector | `/game/assets/ships/containers/sr2_cutaway.png` | 1200×600 |

`getShipInteriorLayout` only defines a grid for explorer (legacy `sr1` aliases it). The grid is 9×3 over the cutaway bay at x 7%, y 13%, w 86%, h 71%. Cells land around 70–142px depending on the panel width.

### Exterior render sites

| Surface | File | How | Size |
| --- | --- | --- | --- |
| Mining | `MiningCanvas.tsx` | Sprite, `scale.x` negative (nose points with the scroll) | width `min(112, worldW * 0.26)`. At 112px wide the 480×180 texture is 42px tall. Anchor near `SHIP_X` = 80 |
| Transit | `TransitCanvas.tsx` (DOM `.transit-rocket-sprite`). Pixi `transitScene.ts` rocket is off (`renderRocket: false`) | `<img>`, rotated 56° | width `clamp(84px, 16vw, 128px)`, height auto (~32–48px before rotation) |
| Debrief | `DebriefCanvas.tsx` | Sprite | width `min(viewport * 0.44, 330)`. At 330px wide the texture is ~124px tall |
| Scrap / recovery | `scrapScene.ts` | Sprite, height fitted to the long edge | long edge `min(H * 0.5, 220)` against texture height, thick edge `min(W * 0.4, 130)` against texture width. Cap binds at about 130×49 |
| Hangar card | `HangarScreen.tsx` | `<img>` | width 240, height auto → 90px for a 480×180 sprite |
| Blueprint step | `MissionSetupRoutes` `.rocketSchematic img` | `<img>` object-fit contain | 84% of a box that is ~35%×58% of the stage (phone landscape overrides differ) |
| Hangar 4-step assembly | `HangarAssembly` in `MissionSetupRoutes.tsx` | **One** exterior `<img>`, clipped three ways. Not separate stage art | Vehicle box: left 19%, right 5%, top 24%, height 48% of the bay. Clips: aft `0–35%`, stage `29–70%`, payload `64–100%`. Phases: SHIPMENT, STAGE, PAYLOAD, INSPECTION |
| Launch cinematic | `launchScene.ts` | Procedural stack. Exterior file is not drawn | Author height 248px (engine exit y=0, nose y=−248). Screen height `min(landscape H*0.40 or portrait H*0.30, 210)`. At 390×844 and 1280×800 the cap is 210px, scale ≈ 0.847 |
| Unused Pixi transit rocket | `transitScene.ts` | Would draw the exterior if `renderRocket` were true | long edge `min(H * 0.18, 110)`, thick edge `min(W * 0.16, 48)` |

## Launch stack (the thing that separates)

Built by `buildLaunchStack`. Origin is the engine exit. Nose is negative Y. Variant is `prospector` when the rocket name matches `/prospector/i`, otherwise `explorer`.

Author pixels, before `rocketScale`:

| Piece | Explorer | Prospector | Notes |
| --- | --- | --- | --- |
| Core width (`wide * 2`) | 32 | 40 | `wide` is 16 / 20 |
| Core body | rect (−wide, −148, width, 120) | same | Interstage ring at y=−34, 6px tall, cyan |
| Fins | ±14px outside the core, y −40 to 4 | same | On the lower-stage container |
| Engine bell | from y=−28 to y=0 | same | Registration point for the whole stack |
| Upper stage | rect from y=−198, height 50, 1px inset | same | Stays on `root` when the lower stage detaches |
| Nose / fairing | polygon from y=−198 to y=−248 | same | |
| Booster body | 14×(152−8), plus a 22px nose | 14×(168−8), plus a 22px nose | Centered at `x = ±(wide + 12)` |
| Booster nozzle | y −12 to 0, 18px wide | same | |

At the 210px screen cap these author sizes multiply by 210/248.

### When stages separate

Clock is `LAUNCH_TIMELINE` in `web/lib/pixi/launchTimeline.ts`. Detach is already implemented (`detachPart` in `launchScene.ts`).

| t (s) | Mark | What moves |
| --- | --- | --- |
| 0.0 | countdown | Stack on the pad |
| 2.6 | ignition | Plume starts. No separation |
| 3.5 | liftoff | Whole stack climbs |
| 6.4 | booster separation | `boosterL` velocity x=−70, `boosterR` x=+70, both vy 55, spin ±0.9 |
| 8.2 | stage separation | `lowerStage` (core + fins + bell) detaches, vy 90, small random vx. Upper stage / fairing stays on the root and continues |
| 9.4 | upper atmosphere | |
| 10.6 | blackout | |
| 11.2 | orbit | |
| 12.8 | departure burn | |
| 14.2 | fade to black | Then `SceneTransition` climb into transit |
| 15.0 | done | `onLaunch()` → transit |

Composition (`web/lib/data/rocket-composition.ts`) agrees: each flyable model has one operating stage (recovery `dismantle`), two boosters (`dismantle`), and a payload mining laser with a fairing. Recipes are materials, not sprites.

| Model | Operating stage id | Boosters | Payload |
| --- | --- | --- | --- |
| explorer | `explorer-operating-stage` | Solid booster set I ×2 | Mining laser I, fairing |
| prospector | `prospector-operating-stage` | Solid booster set II ×2 | Mining laser II, fairing |

Rooms on the operating stage (cockpit, storage, engine) are labels for recovery and the interior grid. They do not draw as separate launch pieces.

## Proposed sprite-sheet hooks

Keep the procedural stack until sheets exist. When they do, replace `buildLaunchStack` shapes with sprites that share this registration.

**Anchor.** Engine-exit center, local `(0, 0)`, nose toward −Y, the same as today. Booster sheets use their own nozzle at local `(0, 0)` and are parented at `x = ±(wide + 12)`.

**One sheet per model** (`explorer`, `prospector`). Do not reuse the horizontal 480×180 flight sprite for this; that file has no stage split.

**Frame layout.** Rows are stages, columns are poses. Cell size should cover the author bounds above (stack 248px tall, boosters ~190px including the nose cone) with padding so separation frames can tilt.

| Row | Contents | Anchor |
| --- | --- | --- |
| `booster-l` | Left booster, mirrored or pre-mirrored | Nozzle center |
| `booster-r` | Right booster | Nozzle center |
| `lower-stage` | Core, fins, bell. Includes the cyan interstage ring | Engine exit |
| `upper-stage` | Upper cylinder + fairing + nose | Base of the upper cylinder, which sits at author y=−148 (top of the core) so it bolts to the lower stage |

| Column | Pose |
| --- | --- |
| `idle` | Pad / coast |
| `burn` | Engine or booster lit |
| `separate` | The frame played as the piece detaches (gap, puff, or broken interstage). One frame is enough; the existing velocity carries it off |

**Events to bind.** The clock already crosses these marks. Name the hooks after the timeline keys so a sheet player can subscribe without a second timeline:

| Hook | Fire when | Sheet action |
| --- | --- | --- |
| `launch:ignition` | t ≥ 2.6 | `burn` on boosters and lower stage |
| `launch:liftoff` | t ≥ 3.5 | keep `burn` |
| `launch:booster-separation` | t ≥ 6.4 | booster rows → `separate`, then the existing detach velocities |
| `launch:stage-separation` | t ≥ 8.2 | lower-stage row → `separate`; upper stage stays `burn` or `idle` |
| `launch:fade` | t ≥ 14.2 | hide the stack; the scene transition owns the climb into transit |
| `launch:complete` | t ≥ 15.0 | unmount |

Flight, mining, transit, debrief, and hangar keep using the horizontal exterior PNG. Those surfaces do not separate stages. A future exterior sheet only needs `idle` (and optionally `burn`) at 480×180, nose to the right, so the current scale math (`shipWidth / texture.width`) stays valid.

## Hangar blueprint builder — customizer parts

`CUSTOMIZER_PARTS` in `web/lib/data/shipCustomizer.ts`. The 4-step onboarding sequence (`getBuildSequence` while missions done &lt; 2) is engine, booster, cockpit, payload. Later missions add fuel-stage, fairing, docking-port, heat-shield, then crew-module and lander when researched.

Rendered sizes:

- Step header thumbnail: 56×56 (`ShipInteriorPreview`).
- Grid icon: the part `img`, else the kind icon from `SHIP_ROOM_ASSETS`. Footprint × cell size (cells ~70–142px).
- Detail diorama: 288×288 source, shown in the step detail panel.

Kind defaults (`SHIP_ROOM_ASSETS` icon 192×192, `SHIP_ROOM_DETAIL_ASSETS` diorama 288×288):

| Kind | Icon | Detail |
| --- | --- | --- |
| cockpit | `cockpit_t1_icon.png` | `cockpit_t1.png` |
| engine | `engine_room_t1_icon.png` | `engine_room_t1.png` |
| booster | `booster_t1_icon.png` | `booster_t1.png` |
| payload | `cargo_bay_t1_icon.png` | `cargo_bay_t1.png` |
| fuel-stage | `fuel_stage_t1_icon.png` | `fuel_stage_t1.png` |
| fairing | `fairing_t1_icon.png` | `fairing_t1.png` |
| docking-port | `docking_port_t1_icon.png` | `docking_port_t1.png` |
| heat-shield | `heat_shield_t1_icon.png` | `heat_shield_t1.png` |
| crew-module | `crew_module_t1_icon.png` | `crew_module_t1.png` |
| lander | `lander_t1_icon.png` | `lander_t1.png` |

Boosters and lasers in the table below **override** the booster kind default with `mining_room_*` art. `booster_t1.png` is on disk and unused by those part ids.

### Engines

| ID | Tier | Art |
| --- | --- | --- |
| `ion-thruster-t1` | 1 | `engine_room_t1` icon + detail |
| `pulse-thruster-t1` | 1 | same `engine_room_t1` (shared with ion) |
| `fusion-thruster-t2` | 2 | `engine_room_t2` |
| `plasma-thruster-t3` | 3 | `engine_room_t3` |
| `array-thruster-t4` | 4 | `engine_room_t4` |
| `antimatter-thruster-t5` | 5 | `engine_room_t5` |

### Boosters and lasers (one customizer kind: `booster`)

| ID | Tier | Art |
| --- | --- | --- |
| `strap-booster-t1` | 1 | `mining_room_t1` (not `booster_t1`) |
| `vulcan-booster-t1` | 1 | same `mining_room_t1` |
| `focused-laser-t2` | 2 | `mining_room_t2` |
| `ringed-laser-t3` | 3 | `mining_room_t3` |
| `twin-emitter-laser-t4` | 4 | `mining_room_t4` |
| `resonant-laser-t5` | 5 | `mining_room_t5` |

### Cockpits

No per-part file. Both fall back to `cockpit_t1`.

| ID | Art |
| --- | --- |
| `cockpit-command-t1` | kind default `cockpit_t1` |
| `guidance-cockpit-t1` | kind default `cockpit_t1` |

### Payloads

| ID | Tier | Art |
| --- | --- | --- |
| `cargo-payload-t1` | 1 | `cargo_bay_t1` |
| `mining-payload-t1` | 1 | same `cargo_bay_t1` |
| `storage-silo-t2` | 2 | `cargo_bay_t2` |
| `storage-silo-t3` | 3 | `cargo_bay_t3` |
| `storage-silo-t4` | 4 | `cargo_bay_t4` |
| `storage-silo-t5` | 5 | `cargo_bay_t5` |

### Stages, fairings, ports, shields, crew, lander

No per-part file unless noted. Both variants of a kind share one picture.

| ID | Kind | Art |
| --- | --- | --- |
| `kerosene-stage-t1` | fuel-stage | kind default `fuel_stage_t1` |
| `lox-lh2-stage-t1` | fuel-stage | kind default `fuel_stage_t1` |
| `standard-fairing-t1` | fairing | kind default `fairing_t1` |
| `heavy-fairing-t1` | fairing | kind default `fairing_t1` |
| `standard-port-t1` | docking-port | kind default `docking_port_t1` |
| `magnetic-port-t1` | docking-port | kind default `docking_port_t1` |
| `ablative-shield-t1` | heat-shield | kind default `heat_shield_t1` |
| `ceramic-shield-t1` | heat-shield | kind default `heat_shield_t1` |
| `crew-quarters-t1` | crew-module | `crew_module_t1` |
| `crew-transport-t2` | crew-module | `crew_module_t2` |
| `crew-transport-t3` | crew-module | `crew_module_t3` |
| `crew-transport-t4` | crew-module | `crew_module_t4` |
| `crew-transport-t5` | crew-module | `crew_module_t5` |
| `lander-module-t1` | lander | kind default `lander_t1` |

`crew_module_t1` and `crew_module_t2` are byte-identical today, and so are t4 and t5. A sheet pass can split them.

## Catalog parts (`PARTS` in `web/lib/data/parts.ts`)

Shop / validation records. They are not the tiles drawn in the current hangar builder. Source sizes measured from `web/public/parts/`.

| ID | Name | File | Source px |
| --- | --- | --- | --- |
| `hull-mk1` | Hull MK1 | `/parts/starter_rocket_t1.png` | 480×480 |
| `hull-mk2` | Prospector Unibody Frame | `/parts/reinforced_hull_t2.png` | 512×512 |
| `hull-cargo` | Cargo Bay T1 | `/parts/cargo_bay_t1.png` | 512×512 |
| `hull-mk3` | Hull MK3 – Heavy Frame | `/parts/hull_mk3_heavy_t3.png` | 512×512 |
| `hull-hauler` | Bulk Hauler Chassis | `/parts/bulk_hauler_t3.png` | 512×512 |
| `ion-a1` | Ion Drive A1 | `/parts/basic_thruster_t1.png` | 512×512 |
| `fusion-b2` | Fusion Drive B2 | `/parts/fusion_drive_t2.png` | 512×512 |
| `ion-a3` | Ion Drive A3 | `/parts/ion_drive_t3.png` | 512×512 |
| `hand-drill` | Hand Drill | `/parts/mining_drill_t1.png` | 512×512 |
| `laser-t2` | Laser T2 | `/parts/laser_drill_t2.png` | 512×512 |
| `plasma-t3` | Plasma T3 | `/parts/plasma_drill_t3.png` | 512×512 |
| `cargo-module-t1` | Cargo Module T1 | `/parts/cargo_bay_t1.png` | 512×512 (same file as `hull-cargo`) |

On disk and not referenced by `PARTS`: `basic_nav_t1.png`, `broadcast_array_t2.png`, `comms_relay_t1.png`, `fusion_reactor_t2.png`, `sample_lab_t2.png`, `small_reactor_t1.png` (all 512×512). `basic_hull_t1.png` (480×480) is only the locked-model placeholder.
