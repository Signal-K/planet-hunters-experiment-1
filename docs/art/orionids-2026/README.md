# Landnam: Orionids 2026 event art (SSL-475)

Assets only. Game files live in `web/public/game/assets/events/orionids/`. This folder holds the previews and contact sheets. 1x is `name.png` and 2x is `name@2x.png`. The 2x files are the native crops from the generated art, trimmed with 4px padding; 1x is an exact half, so anchors match. **Pick the variant set by the active theme.** Blueprint is the default because the UI is locked to light blueprint (SSL-158) and mining is moving to it (SSL-411/453). The dark set is for the current dark mining canvas. `manifest.json` → `variantSets` lists both.

| file | theme | blend | what it is for |
|---|---|---|---|
| `debris/debris-01..04.png` (+`@2x`) | dark | normal | Intact glowing debris chunks, falling or landed and mineable. Anchor is ground contact. 01: 92x74 / 183x147 |
| `debris/debris-01..04-mined.png` (+`@2x`) | dark | normal | Cracked open with cyan crystal core. Swap to it on laser hit; it shares the ground anchor with the intact chunk. |
| `debris/debris-01..04-light.png`, `debris-01..04-mined-light.png` (+`@2x`) | blueprint | normal | Paper versions with a tight halo and a 1.5px ink (#0f2436) stroke (3px at 2x). The soft glow halo washes out on paper. |
| `debris/shard-01..04.png` (+`@2x`) | both | normal | Small shards for break-up or ambient fall particles. |
| `debris/dust-puff.png` (+`@2x`) | both | normal (screen ok on dark) | Cyan dust puff on mine or collect. |
| `fx/streak-01..04.png` (+`@2x`) | dark | screen / normal | Glowing meteor streaks running top-left to bottom-right. Anchor is the head. |
| `fx/streak-line-01..04.png` (+`@2x`) | blueprint | normal / multiply | Hand-inked, chalky tapered and dashed strokes with a small cyan head and no glow. Anchor is the head. |
| `fx/trail-01..03.png` (+`@2x`) | dark | screen / normal | Lingering trail or smoke fragments. |
| `fx/impact-sheet.png` + `.json` (+`@2x`), `fx/impact-01..06.png` | dark | screen / normal | 6-frame impact, equal cells 91x82 (1x), left to right, 12 fps, plays once. |
| `fx/impact-line-sheet.png` + `.json` (+`@2x`), `fx/impact-line-01..06.png` | blueprint | normal / multiply | Inked burst ring and dust ticks. Same cells, anchor and timing as impact-sheet. |
| `fx/debris-fall-sheet.png` + `.json` (+`@2x`) | dark | normal | 8 frames, 160x140 cells (1x), 24 fps. debris-01 with a streak-02 tail rotates -14° to 0°. `fall` = frames 0-5 (loop) and `land` = frames 6-7 (impact). After it lands, swap to static debris-01. |
| `fx/debris-fall-line-sheet.png` + `.json` (+`@2x`) | blueprint | normal | Same timing with debris-01-light, a streak-line-02 tail and impact-line frames. |
| `ui/badge-orionids-2026.png` (512), `-128.png` | dark | normal | One-time Orionids 2026 badge with a dark medallion face. |
| `ui/badge-orionids-2026-light.png` (512), `-light-128.png` | blueprint | normal | Paper face with a 22px grid, ink constellation, cyan meteor with an ink rim, the resource rock and the chalky rim. |
| `ui/icon-meteor.png` (64) / `@2x` (128), `icon-meteor-light` | dark / blueprint | normal | Event glyph. Light = paper disc, ink ring, cyan meteor. |
| `ui/icon-orionid-debris.png` (64) / `@2x` (128) | both | normal | `orionid_debris` resource icon for cargo and Market rows. |
| `ui/icon-radiant.png` / `@2x`, `icon-radiant-light` | dark / blueprint | normal | Radiant starburst. Light = ink-edged with a cyan core and no glow. |
| `ui/chip-orionids-active.png` (+`@2x`, `.svg`, `-dot-off`) | **blueprint (default)** | normal | "ORIONIDS ACTIVE" chip with paper fill, 2px ink border, ink text and an accent #1f78c1 dot. 235x44 at 1x. Text is Oxanium SemiBold 15px with 0.14em tracking. To blink, swap with `-dot-off` (1.2 s). |
| `ui/chip-orionids-active-dark.png` (+`@2x`, `.svg`, `-dot-off`) | dark | normal | Same chip with #1a1a1d fill, 2px #70d9ea border, cyan text and dot. |
| `sky/orionids-sky-overlay-screen.png` (1920), `-1280.png` | dark | **screen** | Orion, radiant, streak fan and haze with black kept. Top-aligned, fit to width. |
| `sky/orionids-sky-overlay.png` (1920), `-1280.png` | dark | normal | Same overlay with alpha from luminance, for engines without screen blend. |
| `sky/orionids-sky-blueprint.png` (1920), `-1280.png` | blueprint | **multiply** | A faint ink line diagram on transparent: Orion, a radiant crosshair, and the streak fan with cyan tick heads. |
| `manifest.json` | - | - | Every asset with sizes, anchors, blend, theme and use, plus `variantSets.blueprint|dark`, theme tokens and QA counts. |
| `docs/art/orionids-2026/preview-mining-orionids.png` | dark | - | Composite on the real 4 Oct mining screenshot: screen sky, 3 falling debris, 1 landing impact, 1 mined chunk on the seam, chip under the title. |
| `docs/art/orionids-2026/preview-mining-orionids-blueprint.png` | blueprint | - | The same layout on token paper with the 22px grid, using the line assets, light debris, the multiply sky and the default chip. |
| `docs/art/orionids-2026/contact-sheet.png`, `contact-sheet-blueprint.png` | - | - | The dark set on #1a1a1d and the paper set on the blueprint grid. |

**Tokens** (from `web/app/globals.css` `.theme-blueprint`): bg #eef3f8, paper #ffffff, paper-2 #dfe9f3, ink #0f2436, ink-dim #48596a, ink-mute #7c8ea0, line rgba(15,36,54,.14/.30), accent #1f78c1. Deck: #1a1a1d and cyan #70d9ea. Font: Oxanium SemiBold. `--ln-bp-pink` is deliberately unused: the event art has no orange and no purple.

**How it was made:** keyed from generated chalky base art on #00FF00 (art box only, not committed). Green excess gives the alpha, which is median-filtered and kept as a soft ramp so the cyan glows stay soft. The colour is unmixed against the screen colour, and spill is removed with G ≤ max(R,B)+2, which leaves cyan alone. 1x downscales are premultiplied. The line fx, chip, light badge and icons, and the blueprint sky are drawn in PIL from the tokens.

**QA:** all 124 PNGs have 0 green-fringe px, 0 orange px and 0 purple px (alpha ≥ 8, sat > 0.22). Edges were checked at 200% on white, paper and #1a1a1d. Downscaling left small fringe counts at 1x (low-alpha unmix noise). A final clamp pass fixed those: green pulled to max(R,B), and orange or purple desaturated to ≤ 0.18. The chip meets SSL-475's minimums: 15px text (≥ 14) and 44px height (≥ 44) at 1x. Nothing is wired into the game yet.
