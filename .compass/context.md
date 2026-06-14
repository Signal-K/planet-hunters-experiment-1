# Landnam — AI Context Brief

This file is the runtime context brief for AI tools operating in the Landnam project.
Read this before generating any assets, planning work, or making design decisions.
Update this file (not compiled code) when the design evolves.

---

## What Landnam Is

Landnam is a **citizen science mining game** in the Star Sailors ecosystem — "Tiny Space Program" in flavour.
Players run a small space program: build rockets from modular parts, accept contractor jobs,
fly to asteroids and exoplanets, mine minerals, classify TESS lightcurve data, sell cargo, reinvest.

**Platform**: Next.js 16, mobile-first, portrait orientation, single-page SPA.
**Player perspective**: a solo operator running NASA from a garage — functional, curious, technical.
**Voice**: terse, command-deck. The HUD talks *to* the operator. No "you", no emoji, no hype.

---

## Game Screens & Flows

The full mission loop: **Hub → Build → Mission Select → Transit → Mining → Return → Debrief → Market**

1. **Earth Base / Hub** — three rooms: Satellite Station, Control Station, Launchpad
2. **Rocket Fabrication** — 3-slot modular assembly (Chassis / Propulsion / Payload)
   - Each slot is a card showing the sprite at 70–80% of the card's lower zone
   - Unselected: desaturated blue-grey cast; Selected/active: warm amber cast + amber glow border
3. **Mission Select** — target system, contractor assignment
4. **Transit** — launch animation, travel
5. **Mining Minigame** — asteroid surface HUD, laser drill operation
6. **Debrief** — mineral yield breakdown, Francs earned, contractor affinity delta
7. **Market / Sell** — sell minerals, reinvest in parts
8. **Star Map / Atlas** — solar system and galaxy navigation (uses `.theme-atlas` variant)

Sprites appear in:
- Rocket Fabrication slot cards (hero image)
- Part selection grids in the Build flow
- Debrief assembled rocket illustration
- Future: Launch animation, stage-separation sequences

---

## Visual Language — Command Deck (Default)

The default game surfaces use a **"Deep Command"** aesthetic: dark navy panels, blueprint grid,
cyan command UI, amber selection accents. Think NASA mission control mixed with a tabletop wargame.

### Color Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Page background | `--ln-bg` | `#0a121d` | All command-deck surfaces |
| Deepest void | `--ln-void` | `#06090f` | Grid base, full-bleed bg |
| Card / panel | `--ln-surface` | `#122236` | Slot cards, info panels |
| Elevated / selected | `--ln-surface-2` | `#18304b` | Active slot, hover row |
| **Command Cyan** | `--ln-cyan` | `#3fa9ff` | Panel titles, CTAs, headers, active UI |
| Cyan bright | `--ln-cyan-bright` | `#6cc2ff` | Hover, highlight states |
| **Vulcan Amber** | `--ln-amber` | `#f5a623` | Selected parts, Francs/currency, active |
| Amber bright | `--ln-amber-bright` | `#ffc25c` | Amber hover |
| Status OK | `--ln-ok` | `#39d36a` | Ready, online, assembly complete |
| Status warn | `--ln-warn` | `#ffb347` | Low power, pending |
| Status crit | `--ln-crit` | `#ff5a6a` | Abort, overload, danger |
| Text | `--ln-text` | `#e6efff` | All foreground readouts |
| Text dim | `--ln-text-dim` | `#a9b8ce` | Body / secondary |
| Text muted | `--ln-text-muted` | `#5d7390` | Captions, labels |
| Hairline | `--ln-hairline` | `rgba(63,169,255,0.18)` | Panel edge at rest |
| Hairline strong | `--ln-hairline-strong` | `rgba(63,169,255,0.45)` | Focused/hovered |

**Mineral hues** (consistent across HUD, debrief, market):
`silicon #b9d8ff` · `iron #d97150` · `ice #9becff` · `carbon #6a7280` · `gold #ffd166` · `rare #c084fc`

### Typography

- **Oxanium** — display + body. Geometric, wide. Weights 200–800.
- **Turret Road** — atlas mono + secondary display. Slab-cut, retro-spacecraft. Used in atlas screens and telemetry footers.
- All **instrument labels** are `UPPERCASE + letter-spaced` (tracking 0.14em).
- Vehicle names follow `WORD-NUMBERROMAN` or `WORD-MK#` pattern: `VULCAN-IX`, `HULL-MK2`, `PULSE-DRILL`.

### Design Rules (hard rules, never violate)

- No emoji anywhere. Status = shape (dot/diamond/square) + color + label.
- No hardcoded hex — always use CSS variables.
- 8pt spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 64px.
- Borders are **ghosted cyan at 18% alpha** (`--ln-hairline`), never solid neutral lines.
- Glow is reserved for *state*, never decoration: cyan = focus/active, amber = selected, green = ready.
- No bluish-purple radial gradients, no image-based nebula backgrounds (outside splash).
- Bounces and springs are forbidden except one overshoot tween on the Francs counter in debrief.

### Atlas Mode (`.theme-atlas`)

Used for Star Map and Galaxy screens. Near-black backdrop with parchment-cream text, dotted star fields.
No glow, no large radii, no shadows. Concentric orbit rings as `border` ellipses or SVG paths.

---

## Sprite Art Direction

> **CRITICAL — READ BEFORE WRITING ANY PROMPT**
>
> All existing Landnam part sprites are **flat 2D vector illustrations** — NOT 3D renders, NOT
> photorealistic, NOT painterly. They look like they were drawn in Figma or Illustrator.
> Any prompt that produces a photorealistic or 3D-looking result is WRONG for this game.

### Exact Visual Template (match this for every sprite)

Look at the existing parts (basic_thruster_t1, basic_hull_t1, cargo_bay_t1, fusion_drive_t2, ion_drive_t3) for the authoritative reference. They all share:

- **Shape**: Rounded rectangle, slightly wider than tall, with small notched/clipped corners on the short ends
- **Canvas**: Square (1:1), module occupies ~70% of canvas width, centred
- **Body colour**: Dark slate blue-grey `#1e2d3d`, slightly lighter in the centre panel
- **Outline**: Dark navy `#0d1520`, clean 2–3px stroke all around
- **Inner panel**: Slightly lighter rectangle inset from edges, suggests module body
- **Orange accents** (`#f5a623`): one horizontal indicator bar across the centre, one filled orange circle (indicator/nozzle/port) on one end
- **Rivets**: Row of small dark dots along top and bottom edges
- **Shadow**: Soft grey oval directly beneath the module
- **Background**: White

### What MUST NOT appear

- 3D rendering, photorealistic shading, or depth-of-field blur
- Specular highlights or metallic reflections
- Painterly brushwork or textured surfaces
- Characters, planets, backgrounds, UI chrome, text, numbers
- Gradients other than the very subtle flat body tone variation

### Prompt Writing Rules

When writing Flux prompts for these sprites:

1. **Lead with the style**: always start with `"2D flat vector game sprite, mobile game UI icon"`
2. **Describe shape variation**: what makes THIS part different from the base template
   - e.g. main stage: "elongated body with prominent nozzle bell on one end"
   - e.g. mining laser: "cylindrical body with a pointed drill emitter on one end, cyan glow ring"
   - e.g. storage bay: "boxy body with two cargo door panels and amber latches"
3. **Keep the colour palette**: dark slate body, orange accents, possibly small cyan detail for energy/sci-fi parts
4. **Do NOT describe materials**: no "brushed steel", no "gunmetal", no "metallic" — these trigger 3D renders
5. **Reinforce the style at the end**: close every prompt with `"flat shading, no 3D render, no gradients, white background"`

### Aspect Ratio

All sprites: **`1:1`** (square canvas). The module shape is drawn landscape-oriented within the square.
Replicate valid values if needed: `1:1`, `16:9`, `21:9`, `3:2`, `2:3`, `4:5`, `5:4`, `3:4`, `4:3`, `9:16`, `9:21`

### Category Variations (flat vector style)

Vary these details from the base template per category — keep the overall template consistent:

- `propulsion` — large orange nozzle circle on one end, exhaust port dots, orange indicator stripe
- `power` — cyan glowing circle indicator, extra panel lines, amber warning dot
- `fuel` — plain body with pressure valve bump on top, filler port dots on side
- `storage` — two cargo door panels, amber latch rectangles, no circle indicator
- `mining` — pointed drill emitter replacing the circle, small cyan glow ring at tip
- `navigation` — small dish/antenna protrusion on top edge, cyan indicator dot
- `hull` — structural rib lines across body, no indicator circle, corner bracket shapes

### Tier Language

- **Tier 1**: Simple, fewer panel details, one orange indicator, plain rivet row
- **Tier 2**: Extra inner panel line, two orange accent dots, slightly more refined corners
- **Tier 3**: Three orange accent dots, cyan energy detail, cleaner corner notches

---

## Sprite Naming & File Layout

```
<category>_<descriptor>_t<tier>.png
```
Examples: `basic_thruster_t1`, `cargo_bay_t1`, `fusion_reactor_t2`, `ion_drive_t3`

For a named rocket system: `<rocket-name>_<part-role>_t<tier>.png`
Examples: `starter_rocket_main_stage_t1`, `starter_rocket_booster_t1`

| Path | Purpose |
|------|---------|
| `web/public/parts/_generated/` | Staging — review before approving |
| `web/public/parts/` | Approved — referenced by `web/lib/data.ts` |

After approving, update `rocketParts[]` in `web/lib/data.ts` (the `imageUrl` field points to `/parts/<name>.png`).

---

## Starter Rocket System (Tier 1 default)

The default rocket for early mining missions (M1). Used to go to asteroids, mine, return to base.
The payload is a mining tool section (mining laser + storage bay).
After mining missions the rocket returns to base for debrief, selling minerals, and optionally scrapping/salvaging.

The rocket can be visually broken into separate compositable sprites — each part is independent:

All sprites use `1:1` aspect ratio — square canvas, module drawn landscape-oriented within it, matching the existing part style.

| Sprite | Shape variation from base template |
|--------|-------------------------------------|
| `starter_rocket_main_stage_t1` | Long body (widest of all parts), large orange nozzle circle on right end, amber stripe across centre, rivet rows top and bottom |
| `starter_rocket_booster_t1` | Slim elongated body, pointed left end, small orange nozzle circle on right, minimal detail |
| `starter_rocket_second_stage_t1` | Medium body, slightly narrower than main stage, small orange nozzle circle, two accent dots |
| `starter_rocket_payload_fairing_t1` | Tapered/wedge body widest on left narrowing to a point on right, no nozzle circle, amber tip indicator |
| `starter_rocket_mining_laser_t1` | Standard body with pointed drill emitter on right end replacing circle, small cyan glow ring at drill tip |
| `starter_rocket_storage_bay_t1` | Boxy body with two cargo door panels, amber latch rectangles, no nozzle circle |
| `starter_rocket_engine_flame_t1` | Orange/amber teardrop flame shape, wider at top narrowing downward, flat vector style, no body shell |

---

## Integration Patterns

**Adding a generated sprite to the game:**
1. Move approved PNG from `web/public/parts/_generated/` to `web/public/parts/`
2. Add entry to `rocketParts[]` in `web/lib/data.ts`:
   ```ts
   { id: "starter_rocket_main_stage_t1", name: "Main Stage", tier: 1,
     category: "fuel", imageUrl: "/parts/starter_rocket_main_stage_t1.png",
     mass: 80, power: 0, cost: 500, missionsRequired: 0 }
   ```
3. Run `npm run typecheck` from `web/` to verify
4. For sprites that replace existing placeholders, check `GameApp.tsx` component for any hardcoded `imageUrl` references

**Existing approved sprites** (in `web/public/parts/`):
`basic_hull_t1`, `basic_nav_t1`, `basic_thruster_t1`, `cargo_bay_t1`, `comms_relay_t1`,
`fusion_drive_t2`, `fusion_reactor_t2`, `ion_drive_t3`, `laser_drill_t2`, `mining_drill_t1`,
`reinforced_hull_t2`, `sample_lab_t2`, `small_reactor_t1`

---

## Canonical Design Docs

For deeper context on any of the above, read these:
- Design system: `Landnam/.agents/skills/landnam-design/README.md` (visual language, colors, typography, layout)
- Sprite generation spec: `.knowns/docs/Landnam-docs_game-art_rocket-part-sprite-generation-spec.md` (authoritative art brief)
- Game design: `.knowns/docs/Landnam-docs_game-design_*` (mechanics, economy, progression)
- CSS design tokens: `web/app/globals.css` (all CSS variables)
