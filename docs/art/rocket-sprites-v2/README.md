# Landnam rocket sprites v2 (2026-10-03)

v2 is cut from the generated chalky base art in `gen/` (art box only; not in this repo). Those JPGs on chroma green were keyed with `docs/art/rocket-sprites-v2/tools/key.py`: corner-median background, spill-based alpha, a median filter on the alpha, unmixing against the background, and despill G ≤ max(R,B)+3. A final pass then pulls dark despilled fringe pixels that turned purple or orange back to sat ≤ 0.30. The painted texture is kept. Nothing was redrawn.

## Outputs
| file | what |
|---|---|
| `web/public/game/assets/rockets/launch/explorer-launch-sheet.png` + `.json` | 116 frames, 4059x1988, Pixi Spritesheet JSON plus `animations` and a `landnam` block (fps, loop, duration, attachAuthor, zIndex, hooks, notes). `meta.image` is `explorer-launch-sheet.png`. |
| `web/public/game/assets/rockets/launch/prospector-launch-sheet.png` + `.json` | 116 frames, 4091x2087, same layout. `meta.image` is `prospector-launch-sheet.png`. |
| `web/public/game/assets/rockets/launch/fx-sheet.png` + `.json` | 66 frames, 4087x698: pad-smoke, sep-puff, stage-sep-flash, debris, clamp-tumble. `meta.image` is `fx-sheet.png`. |
| `docs/art/rocket-sprites-v2/separation-preview.mp4` | 1280x1080, 24 fps, 245 frames (10.2 s), both models, H.264 yuv420p. About 4 MB, so it is committed. |
| separation-preview.gif | 480x405, 24 fps, 245 frames, 96-colour palette (8 MB). Not in this archive and not committed. |
| `docs/art/rocket-sprites-v2/separation-strip.png` | 12 steps x 2 models, frame-exact from the sheets |
| `web/public/game/assets/rockets/parts/<id>_icon.png` (192) + `<id>.png` (288) | 17 parts, chalky tile and room framing |
| `docs/art/rocket-sprites-v2/parts-contact-sheet.png` | all 17 parts, plus each icon at 144 and 56 px |
| `gen/`, `src/`, `qa/` | Art-box only. Not committed. `src/` is the green-composite copies of the sheets plus `src/parts/<id>_green.png` (raw JPG cell) and `<id>_cut.png` (keyed cut). `qa/` is hue-check.md, qa.json (alignment + continuity), stack-alignment.png, and frame peeks. |
| `docs/art/rocket-sprites-v2/tools/` | key.py, seg.py, pieces.py, fxcut.py, sheets.py, preview.py, strip.py, parts.py, contact.py, qa.py, peek.py |

## Animations (24 fps)
| row | anim | frames | loop |
|---|---|---|---|
| booster-l / booster-r | idle | 1 | - |
| | ignition (plume grows) | 8 | no |
| | burn (flicker / shimmer) | 8 | yes |
| | separate (plume cut-off, pyro flash at both pods, clamp breaks + tumbles, debris, gas puff, dissolve) | 12 | no |
| lower-stage | idle / ignition / burn / separate (ring flash, debris, puffs, plume dies) / coast | 1 / 8 / 8 / 12 / 1 | burn loops |
| upper-stage | idle / separate (nozzle shows, base flash, ullage puffs) / relight / burn / coast | 1 / 10 / 8 / 8 / 1 | burn loops |
| fx | pad-smoke 24, sep-puff 12, stage-sep-flash 8, debris 10, clamp-tumble 12 (loop) | | |

Hooks are in the JSON: `launch:ignition` 2.6 s, `launch:liftoff` 3.5, `launch:booster-separation` 6.4, `launch:stage-separation` 8.2, `launch:fade` 14.2, `launch:complete` 15.0.

Pixi usage: `new AnimatedSprite(sheet.animations['booster-l/burn'])` with `animationSpeed = 24/60`. Anchors are baked per frame. Booster anchor = nozzle exit, so runtime spin pivots on the nozzle. Draw order is upper (z 0) < lower (z 1) < boosters (z 2).

## Geometry
Geometry is unchanged from v1: 2 px per author unit, stack origin at the core engine exit, boosters at x=±(wide+12), upper stage attached at author y=-148. The generated pieces were fitted with light non-uniform scale:
- Boosters: sx 0.50, sy fitted to 2·(H+22).
- Core: sx 0.55 / 0.60.
- Upper: sx 0.55 / 0.60.

The core ring top is punched open in the stacked frames, so the upper stage seats inside the cyan ring.

The left and right boosters share one source art: `booster-r` is a mirror of the better generated booster, which has its clamp pod on the inner side. Because of the mirror, its painted light comes from the opposite side.

## QA
- Hue and halo: every PNG, the GIF and the MP4 have 0 orange px, 0 purple px and 0 green-halo px. The one exception is 16 purple px summed over 41 sampled MP4 frames, caused by YUV420 chroma subsampling (the GIF and PNG sources are 0).
- Seam: the upper/core seam has 0 see-through px in the inner span. Booster/core junction gap is 0 px.
- Continuity (qa.json, art box only): every handoff between consecutive anims (≤2.5 mean abs diff) is below that anim's own largest frame step. Each burn loop's wrap step is within 1.1× of its in-loop steps (0.7–1.3), so the loops are seamless.

## Integration targets

Nothing in this folder is wired into the game yet. The consumers are:

| Asset | Code |
|---|---|
| `web/public/game/assets/rockets/launch/explorer-launch-sheet.png` + `.json`, `prospector-launch-sheet.png` + `.json` | `buildLaunchStack` and `detachPart` in `web/lib/pixi/launchScene.ts`. Playback times come from `LAUNCH_TIMELINE` in `web/lib/pixi/launchTimeline.ts` (`ignitionStart` 2.6, `liftoff` 3.5, `boosterSep` 6.4, `stageSep` 8.2, `fadeOut` 14.2, `done` 15.0), which match the sheet `landnam.hooks` (`launch:ignition`, `launch:liftoff`, `launch:booster-separation`, `launch:stage-separation`, `launch:fade`, `launch:complete`). |
| `web/public/game/assets/rockets/launch/fx-sheet.png` + `.json` | Same launch scene and timeline. `landnam.hooks` names the fx anims for ignition, liftoff, booster separation, and stage separation. |
| `web/public/game/assets/rockets/parts/<id>_icon.png` and `<id>.png` | `CUSTOMIZER_PARTS` in `web/lib/data/shipCustomizer.ts`. The 17 filenames are those part ids: ablative-shield-t1, ceramic-shield-t1, cockpit-command-t1, crew-transport-t2, crew-transport-t5, guidance-cockpit-t1, heavy-fairing-t1, kerosene-stage-t1, lander-module-t1, lox-lh2-stage-t1, magnetic-port-t1, mining-payload-t1, pulse-thruster-t1, standard-fairing-t1, standard-port-t1, strap-booster-t1, vulcan-booster-t1. |

`docs/art/rocket-sprites-v2/separation-strip.png`, `parts-contact-sheet.png`, and `separation-preview.mp4` are reference only.
