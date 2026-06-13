# Landnam — Design System

> **Landnam** is a mining and exploration minigame inside the **Star Sailors** universe — *Tiny Space Program* in flavour. Players build rockets, accept contractor jobs, mine planets and asteroids, and progress from a single Earth Base into off-world settlements. The game is built in **Godot 4.5+**, ships **mobile-first in landscape**, and runs across mobile, web and desktop.
>
> This design system codifies the *visual command-deck* aesthetic seen in the rocket fabrication and atlas screens: dark navy panels, blueprint grids, cyan command UI with amber selection accents, parchment-cream atlas variants, and the tracked-uppercase Oxanium/Turret Road type pairing.

---

## Index

| File / Folder | What's in it |
| --- | --- |
| `colors_and_type.css` | All CSS variables — color, type, radii, spacing, motion, shadow. Import this in every mock. |
| `fonts/` | Oxanium (display/body) + Turret Road (atlas mono/display) — see Typography below. |
| `assets/icons/` | Real SVG icons exported from the Godot scene — nav glyphs (`nav_back`, `nav_forward`, `nav_map`, `nav_market`, `nav_menu`, `nav_mission`, `godot-icon`). |
| `assets/reference/` | The source screenshots provided by the user. Use these as visual ground truth. |
| `preview/` | One small HTML card per token cluster — these are what light up the **Design System** tab. |
| `ui_kits/landnam-game/` | Component-level recreations of in-game screens (Launchpad/Rocket Fab, System Atlas, Mission HUD). Mobile-landscape canvas, JSX components. |
| `SKILL.md` | Skill manifest so this system can be invoked by Claude Code or other agent runners. |
| `README.md` | This file. |

---

## Source material

This system was distilled from:

- **`signal-k/planet-hunters-experiment-1`** — the Godot 4.5+ source repo for Star Sailors / Planet Hunters.
  - <https://github.com/signal-k/planet-hunters-experiment-1>
  - Relevant files inside the repo:
    - `scene/Scripts/UI/DS.gd` — light-mode design tokens (current refactor target, "Terminal Ethereal")
    - `scene/Resources/NebulaSciTheme.gd` — legacy dark-space theme aliases
    - `scene/Scenes/UI/*.tscn` — concrete panels (LaunchWizard, ControlStationPanel, SpaceMap, SidescrollMining, etc.)
    - `scene/Resources/Icons/*.svg` — the nav icon family
  - Explore further when designing new surfaces — the repo has 100+ `tscn`/`gd` UI files we did not enumerate.
- **User-supplied screenshots** (now in `assets/reference/`):
  - `rocket-fabrication.png` — three-slot rocket assembly with Chassis / Propulsion / Mining Drill cards, the amber **VULCAN-IX** selection state, and the "READY FOR LAUNCH" assembly bar.
  - `solar-system.png` — orbital atlas with concentric ring orbits, planet glyph chips, and a bottom telemetry rail.
  - `galaxy-map.png` — wider star map with a square selection reticle around SOL and a "SYSTEM TELEMETRY" footer panel.
  - `stellar-os.png` — "STELLAR_OS" header treatment with `SOLAR SYSTEM / GALAXY` tabs and `QUERY_SECTOR…` search.
- **User design brief** — the Star Sailors / Landnam progression notes (Chapters 1–3, M1–M3 onboarding, Free Operations, contractor milestones, asteroid classification, etc.). The brief is preserved verbatim in this README's *Game Context* section below.

---

## Game Context (the brief)

Landnam transitions from a strictly authored "tutorial rail" into an open-ended **Free Operations** loop. Progression is driven by XP (mining, scanning, missions) and Level Unlocks.

**Chapters**
- **Ch. 1 — The Baseline (M1–M2):** core *Launch → Mine → Return* loop. Earth Base as the hub. Economy = **Francs** + **Contractors**.
- **Ch. 2 — The Scientific Leap (M3):** Citizen Science integration via the **Satellite Station** and real TESS lightcurve data.
- **Ch. 3 — Free Operations (post-M3):** open loop driven by level milestones (L4–L8+) unlocking new rockets, room upgrades, off-world infrastructure.

**Authored onboarding**
- **M1** baseline launch → mine → return → debrief.
- **M2** introduces the **Control Station** + job board / contractor affinity.
- **M3** introduces the **Satellite Station** + lightcurve classification.

**The Hub (Earth Base)** is composed of three operational rooms:
- **Satellite Station** — scan, review lightcurves, classify candidates.
- **Control Station** — browse the contractor job board.
- **Launchpad** — assemble rockets, assign targets / contractors.

**Mission Loop** = Transit → Mining minigame → Return → Debrief.

**Future hooks:** contractor milestone missions, asteroid classification, mining anomalies, social/multiplayer consensus, daily/seasonal operations.

---

## CONTENT FUNDAMENTALS

The voice is **terse, technical, and command-deck** — the player is the operator of a small space program, not a fantasy hero. Tone is closer to NASA mission control mixed with a tabletop wargame than to a marketing site.

### Casing & punctuation
- **UPPERCASE + letter-spaced** for instrument labels, button copy, status pills, vehicle designations, and section eyebrows.
  - `CHASSIS · PROPULSION · MINING DRILL · LOCATION SET · MISSION SET · ASSEMBLY COMPLETE · NEXT STAGE → · READY FOR LAUNCH · TOTAL MASS · POWER DRAW`
- **Title Case** for screen titles ("Launch Wizard", "Mission Debrief", "Control Station").
- **Sentence case** for body / explanatory copy and dialog.
- **Mono casing with units** for telemetry readouts. Always include the unit, no space if it's a single char: `140 T`, `12 MW`, `0.00 LY`, `4.57 GYR`, `25.1 ly`, `8 DETECTED`.

### Identifiers
- Vehicles and parts are codenamed `WORD-NUMBERROMAN` or `WORD-MK#`: `VESSEL-X12 (HEAVY)`, `HULL-MK2`, `VULCAN-IX`, `PULSE-DRILL`.
- Star systems use real catalogue names (`SOL`, `ALPHA CENTAURI`, `SIRIUS`, `VEGA`, `PROCYON`, `WOLF 359`, `BARNARD'S STAR`) with light-year distance suffix `25.1 ly`.
- Software builds reference a "command version" footer: `SOLAR SYSTEM STRATEGIC ATLAS // COMMAND VER 4.0.2`.

### Pronouns / framing
- Avoid first-person ("we", "I"). The HUD talks **to** the operator or simply states facts. No "you" either in inline labels — it's all object names + states. Tutorial overlays and dialog are the only place to address the player directly, and even then prefer imperative voice: *"Select a chassis." / "Confirm launch."*
- Contractors and characters speak with personality in dialog and debriefs; HUD never does.

### Vibe
- Curious and serious — the joke is that the player is running NASA out of a garage. Lean **functional > flowery**. Never use "amazing", "incredible", "magical".
- **No emoji.** Status is communicated with shape (dot, square, diamond), color (cyan / amber / green / red) and a single trailing label, never an emoji glyph.

### Example copy

```
LOCATION SET ─────  MISSION SET ─────  ✓ ASSEMBLY COMPLETE
VESSEL-X12 (HEAVY) — COMPLETE
TOTAL MASS  140 T          POWER DRAW  12 MW
[ NEXT STAGE → ]

SYSTEM TELEMETRY : SOL
CLASS   YEL DWARF / G2V    AGE   4.57 GYR
DIST    0.00 LY             PLANETS  8 DETECTED
[ SYSTEM VIEW ]

CURRENT LOCATION   Earth · Sol III
EXPLORED OBJECTS   1
UNEXPLORED OBJECTS 24
```

---

## VISUAL FOUNDATIONS

Landnam's visual language is **two faces of the same console**:

1. **Deep Command** *(default)* — navy room with a blueprint grid, used in any *active operations* surface: Launchpad/rocket fabrication, Mining minigame HUD, Mission debriefs, Earth Base rooms. Cyan is the primary action color, amber is selection/active/currency, status colors signal mission state.
2. **Atlas** *(`.theme-atlas`)* — near-black backdrop with parchment-cream text and dotted-grid star fields. Used for **map** surfaces: Solar System, Galaxy, Sector. Stripped chrome, mono-tech typography, no glow.

### Color

Source of truth: `colors_and_type.css`.

| Role | Token | Hex | Used for |
| --- | --- | --- | --- |
| Page bg | `--ln-bg` | `#0a121d` | All command-deck surfaces |
| Card / panel | `--ln-surface` | `#122236` | Slot cards, info panels |
| Elevated / selected idle | `--ln-surface-2` | `#18304b` | Active slot, hover row |
| **Primary — Command Cyan** | `--ln-cyan` | `#3fa9ff` | Panel titles, CTA, headers, links |
| **Highlight — Vulcan Amber** | `--ln-amber` | `#f5a623` | Selected/active state, Francs/currency, propulsion |
| Status OK | `--ln-ok` | `#39d36a` | Ready, online, assembly complete dots |
| Status warn | `--ln-warn` | `#ffb347` | Low power, pending |
| Status crit | `--ln-crit` | `#ff5a6a` | Abort, overload, danger |
| Text | `--ln-text` | `#e6efff` | All foreground readouts |
| Text dim | `--ln-text-dim` | `#a9b8ce` | Body / secondary |
| Text muted | `--ln-text-muted` | `#5d7390` | Captions, axis labels |
| Hairline | `--ln-hairline` | `rgba(63,169,255,0.18)` | Panel edge |
| Atlas paper | `--ln-text` *(in `.theme-atlas`)* | `#efe7d3` | Atlas screen text |

**Mineral / data hues** (`--ln-mineral-*`) give each resource a consistent color across HUD, debrief, market, charts: silicon `#b9d8ff`, iron `#d97150`, ice `#9becff`, carbon `#6a7280`, gold `#ffd166`, rare `#c084ff`.

### Type

Two families, one pairing:

- **Oxanium** — display + body. Geometric, wide, tech-with-warmth. Use for HUD readouts, panel titles, button copy, and body. Weights 200–800 shipped.
- **Turret Road** — secondary display + monospace-feeling. Slab-cut, retro-spacecraft. Use in the **atlas** variant for catalogue labels (`VEGA 25.1 ly`, `BARNARD'S STAR`) and for telemetry footers (`COMMAND VER 4.0.2`).

Both are real font files in `fonts/` — no substitution. Both also exist on Google Fonts as a fallback if a downstream agent loses the binaries.

Type scale anchored at **1920×1080**:

| Token | Size | Family / weight | Used for |
| --- | --- | --- | --- |
| `--ln-fs-display` | 72px | Oxanium 700 | Hero readouts, currency, mission outcomes |
| `--ln-fs-title` | 48px | Oxanium 700 | Screen / overlay titles |
| `--ln-fs-h1` | 36px | Oxanium 600 | Card / module headers |
| `--ln-fs-h2` | 28px | Oxanium 600 | Sub-headers |
| `--ln-fs-body` | 22px | Oxanium 400 | Body / paragraph |
| `--ln-fs-button` | 20px | Oxanium 600 | CTA button copy |
| `--ln-fs-label` | 16px | Oxanium 600, `tracking 0.14em`, UPPER | Instrument labels |
| `--ln-fs-micro` | 13px | Oxanium 500 / Turret Road 400 | Annotations, axis ticks |

**Hard rule:** never under 18px on the 1920×1080 canvas. Mobile-landscape devices will further scale this down; minimum on-device is 14px.

### Spacing

Strict **8-pt rhythm**: `--ln-s-1` 4 · `s-2` 8 · `s-3` 12 · `s-4` 16 · `s-5` 24 · `s-6` 32 · `s-7` 48 · `s-8` 64. Card inner padding defaults to `s-4` mobile / `s-5` desktop. Inter-card gap on the Launchpad is `s-5` (24px). Section gutters at 1920 width are `s-7` (48px).

### Radii

`--ln-r-xs` 2 · `sm` 4 · `md` 6 · `lg` 8 · `xl` 14 · `pill` 999.

- **Cards & panels**: `--ln-r-lg` (8px). Soft but never bubbly.
- **Buttons**: `--ln-r-md` (6px) standard; `--ln-r-xl` (14px) for the big "NEXT STAGE" primary CTA only.
- **Inline chips, mineral tags, status pills**: `--ln-r-pill` for currency/status, `--ln-r-xs` for mineral tags.
- **Atlas mode**: corners stay at 4–6px; no large radii.

### Borders & hairlines

- **No 1px solid neutrals**. Edges are **ghosted cyan at 18% alpha** (`--ln-hairline`) so the chrome reads as projected, not stamped.
- Selected/focused: cyan jumps to 45% alpha *or* amber `--ln-amber-border` for the "this is what you picked" state.
- Inside a panel, use `--ln-divider` (12% cream / blue-grey) for row separators. Never two stacked dividers in a row — use spacing instead.
- Atlas mode uses hairlines at 10% / 32% cream, never blue.

### Shadows & glow

Two systems coexist:

- **Card shadow** (`--ln-shadow-card`): a 1px inner-top highlight + a soft 24px outer drop. Use on every elevated card to lift it off the grid.
- **Modal shadow** (`--ln-shadow-modal`): heavier 64px outer drop, no inner highlight, used on overlays/dialogs.
- **Glow** is reserved for *state*, never decoration:
  - `--ln-glow-cyan` — focus ring around inputs, active comm channels
  - `--ln-glow-amber` — currently-selected slot card (see VULCAN-IX in the rocket fab)
  - `--ln-glow-ok` — "READY" / status-OK dots

### Backgrounds

The default scene background is a **blueprint grid**: a vertical gradient from `--ln-bg` to `--ln-void`, layered with 48px x 48px hairline grid lines at ~6% cyan. The composite is exposed as `--ln-bg-blueprint`.

For atlas screens, swap to `.theme-atlas`. The atlas backdrop is near-black with **dotted star fields** (`--ln-bg-stars`) and concentric orbit rings drawn as `border` ellipses or SVG paths, *not* as background images. No full-bleed photography. No gradients other than the page wash.

Never use:
- Bluish-purple radial gradients
- Image-based "nebula" backgrounds outside the splash
- Drop shadows in atlas mode

### Animation & interaction states

The Godot scenes lean on tweens; in HTML mirrors we standardise via CSS variables.

| Token | Duration | Easing | Use |
| --- | --- | --- | --- |
| `--ln-d-quick` | 120ms | `--ln-ease-snap` | Hover, press feedback, tooltip in |
| `--ln-d-base` | 220ms | `--ln-ease-out` | Tab swap, panel reveal, slot select |
| `--ln-d-slow` | 420ms | `--ln-ease-mech` | Wizard step, full-screen transition |

**Hover** — slot cards lighten one surface step (`surface` → `surface-2`) and the hairline goes 18% → 45% cyan. No translate, no shadow change. Buttons lighten the fill by ~6%.
**Press** — buttons drop to `--ln-cyan-press` / `--ln-amber-press` and scale down to 0.98 over 80ms. No depressing inset shadow.
**Selected / active** — cards swap the cyan hairline for `--ln-amber-border` and the title text turns amber. Add `--ln-glow-amber`. The original card fill stays — selection is communicated by border + title color, not by a fill swap.
**Disabled** — `opacity: 0.4`, cursor `not-allowed`, no pointer events.
**Focus (keyboard / gamepad)** — 2px solid `--ln-cyan` outline with 2px offset.

**Bounces / springs / flourishes are forbidden** outside of mission-debrief reward reveals (a single overshoot tween on the amber Francs counter is allowed and used in the codebase). Everything else is linear or ease-out.

### Transparency & blur

- Modal scrims = `--ln-overlay` (rgba(6,9,15,0.72)) **without** blur. The team's Godot target includes mobile GL Compatibility — `backdrop-filter` is mocked in HTML only.
- HUD overlays *on top of the mining minigame* may use a 6–10px blur as an HTML approximation; flag it in code if you do.

### Iconography in layout

- Iconography always sits to the **left** of its label, separated by `--ln-s-2` (8px). Icon stroke matches its label color exactly.
- Panel headers carry a small leading glyph (`nav_mission.svg`-style outline icon, see Iconography).
- Bottom bars use icon + UPPERCASE label stacked horizontally with a `1px` cyan hairline rule between segments.

### Layout rules

- **Always landscape.** Design canvases are `1920×1080` or `1280×720`. Vertical orientation is unsupported.
- **Bottom action bar is sacred** — every operations screen has a fixed bottom bar with status segments on the left, the primary CTA on the far right. Don't replace it with floating buttons.
- **Three-up card layouts** (chassis / propulsion / drill) are the canonical "pick a part" grid. Min card width 280px on mobile-landscape.
- Maximum content width inside a panel is 1280px on a 1920 canvas (centered with `s-7` gutters).

### Imagery vibe

When 3D render assets appear (rocket parts), they sit on **studio-lit dark backdrops** — desaturated blue cast for un-selected items, warm amber cast for the active one. No grain, no scanlines. The image fills 70–80% of the slot's lower zone; the part name sits in a small dark pill below it.

---

## ICONOGRAPHY

Landnam ships a **small hand-crafted SVG icon set** from the Godot project (`scene/Resources/Icons/*.svg`, copied here to `assets/icons/`). The set is intentionally minimal — 6 navigation glyphs at the moment:

- `nav_back.svg`, `nav_forward.svg` — wizard navigation
- `nav_menu.svg`, `nav_mission.svg` — primary nav
- `nav_map.svg` — atlas access
- `nav_market.svg` — marketplace (post-L5 unlock)
- `godot-icon.svg` — fallback / dev placeholder

Plus the user-supplied screenshots demonstrate additional reused glyphs (rocket, satellite, sun, globe-planet, search lens, layer toggle, settings cog, notifications bell, sliders, "checkmark-in-circle" complete pill, target reticle). These do not yet exist as standalone SVG files in the repo — when you need one **prefer the Lucide stroke set** (`https://lucide.dev/`) which matches the existing weight/cap style:

- `lucide:rocket`, `lucide:satellite`, `lucide:globe`, `lucide:sun`, `lucide:search`, `lucide:layers`, `lucide:settings`, `lucide:bell`, `lucide:sliders-horizontal`, `lucide:check-circle-2`, `lucide:crosshair`.

Flag any Lucide substitution to the user — eventually the real glyph should be hand-drawn to match the Godot set's slightly chunkier 2.2px stroke + flat caps.

### Rules
- **Stroke weight 2px** at 24px viewport, **flat caps**, **round joins**. Never filled-and-outlined together.
- Icon color **inherits from currentColor** — pair with a `--ln-cyan` / `--ln-text-dim` / `--ln-amber` text color.
- **No emoji.** Anywhere. Status is shown as a dot/diamond chip, never `🟢`.
- **No unicode glyph misuse** (e.g. `▶` for play, `★` for rating). Use SVG.
- Dev-only placeholders (`godot-icon.svg`) must never ship in user-facing screens.

---

## Notes & open questions

- The Godot repo (`DS.gd`) is mid-migration to a **light-mode "Terminal Ethereal"** theme. We deliberately preserved the **dark deep-space variant** as the canonical Landnam look here, because every user-supplied screenshot is dark. When the light theme lands in-engine, we'll add a `.theme-light` variant to `colors_and_type.css` alongside Deep and Atlas.
- Iconography beyond the 6 nav glyphs is currently filled by Lucide CDN. Replace with hand-drawn SVGs as the team produces them.
- We have not yet sourced the rocket-part 3D renders (`HULL-MK2`, `VULCAN-IX`, `PULSE-DRILL`). The UI kit ships dark-on-dark placeholder tiles in their place — wire up the real renders by replacing `ui_kits/landnam-game/assets/part-*.png`.
