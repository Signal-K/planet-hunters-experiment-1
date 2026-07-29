# Landnam — Design System v2 (Glass HUD)

**2026-07-24 revision** — Full visual overhaul: glass-HUD telescope aesthetic across all gameplay panels. Mission Board keeps Light Editorial (parchment/clipboard) as the one deliberate departure.

---

## Registers

### GLASS HUD — DEFAULT
All gameplay screens (Rocket Construction, Mining Run, Earth Base). Real starfield/nebula photo backdrop (CSS starfield placeholder, replace with actual photo); translucent white glass panels with backdrop-blur; light blue (#6cd4ff) primary, lime-green (#2fbf6a) success/payout, vivid red (#ff4438) danger.

### LIGHT EDITORIAL
Mission Board only. Warm off-white paper (#ede0c4), dark warm ink (#3a2c1a). Cyan/amber as accents only, never dominant.

---

## Color — Surfaces

| Token | Value | Usage |
|---|---|---|
| `--ln-panel` | `rgba(255,255,255,0.20)` | Glass panel base |
| `--ln-panel-2` | `rgba(255,255,255,0.28)` | Raised glass |
| `--ln-border` | `rgba(255,255,255,0.45)` | Glass edge borders |
| `--ln-shell` | `#23345a` | Shell backdrop tint |
| `--space-bg` | `#24366a` | Backdrop photo tint |
| `--space-bg-far` | `#0e1526` | Far space / deep bg |

## Color — Accents & Status

| Token | Value | Usage |
|---|---|---|
| `--ln-cyan` | `#6cd4ff` | Lead accent, active states |
| `--ln-ok` | `#2fbf6a` | Success, payout bars |
| `--ln-crimson` | `#ff4438` | Danger, hull-low, locked |
| `--ln-payout` | `#baf25a` | Payout emphasis, status |
| `--ln-amber` | `#e0a527` | Minimal — currency numerals only |
| `--status-ready` | `#f0e6c8` | Ready status pills |

No magenta/pink anywhere in the palette. Amber is minimal — currency numerals only, never a panel/headline/CTA.

## Mineral Palette (locked, never invent)

| Mineral | Token | Value | Icon |
|---|---|---|---|
| Silicon | `--mineral-silicon` | `#7dd8ff` | Intersecting diamonds |
| Iron | `--mineral-iron` | `#d97150` | (not yet in cost chips) |
| Ice | `--mineral-ice` | `#8ee7ff` | 2×2 diamond crystal stack |
| Carbon | `--mineral-carbon` | `#6a7280` | (not yet in cost chips) |
| Gold | `--mineral-gold` | `#ffcf40` | 5-point star shape |
| Rare | `--mineral-rare` | `#2fbf6a` | (not yet in cost chips) |

All mineral icons are 24×24 outline SVGs with `stroke="currentColor"`, rendered at 7×7px in cost chips. Gold uses a 5-point star polygon; ice uses a 2×2 diamond-crystal stack.

## Typography — Three Fonts, Fixed Jobs

| Font | Weight | Usage |
|---|---|---|
| **Oxanium 800** | 800 | Display — headings, big numeric values, CTAs. Wide tracking (0.14–0.22em) on small uppercase labels. |
| **Oxanium 400** | 400 | Body — descriptive/paragraph text only, sentence case. |
| **Turret Road** | 400/700 | Numeric readouts — timers, counters, coordinates, mineral symbols. |

## Spacing — 8pt Rhythm Only

`4px` `8px` `12px` `16px` `24px` `32px` `48px` `64px`

## Component Vocabulary

- **Button Primary** — filled cyan/lime/amber. Font-display 800, uppercase, 0.08em tracking.
- **Button Ghost** — transparent with border. 0.1em tracking.
- **Status Pill** — rounded pill. Cream for ready, amber for cooldown, muted for locked.
- **Icon Badge** — bordered tile (Out There style), 28×28px, 1.5px white border, bg rgba(0,0,0,0.3).
- **Chip** — compact label with border and tinted background.
- **Segmented Bar** — row of segments for stat/value indicators.
- **Client Mark** — 40px circular badge with initials.
- **Confirm Action Sheet** — overlay dialog that gates every irreversible action. Title + description + Cancel/Confirm.

## Texture & Rendering — Chunky, Cel-Shaded, No Grain

- Flat color fills, volume via 2–3 discrete facets (lit top / shaded side) — never gradient-as-texture.
- Bold silhouettes, hard-edged shadow polygons — no soft drop-shadows standing in for form.
- Saturated color blocking — no desaturating for "realism".
- No grain/noise/scanline/paper-texture overlays. Glows are the only permitted softness.

## Greeblies (Telescope-UI Inspiration)

- **Corner brackets** — L-shaped cyan accent lines at panel corners (2px wide × 24px long). Rendered as SVG paths, 18×18px at each corner of the canvas viewport.
- **Data overlays** — small technical labels at top-left/top-right of viewports (e.g. "STATUS: ACTIVE", "PART COUNT: 12/12").
- **Concentric rings** — telescope-inspired circular frames around key viewport elements.
- **Crosshair / centering reticle** — subtle SVG centering guides (120×120px, 0.5px stroke) at the center of the rocket canvas.
- **System status** — pulsing status dots (online/warn/offline) for telemetry.
- **Canvas nebula glow** — layered radial gradients at 28%/72%/50% positions for depth.
- **Hologram scanline** — fine repeating horizontal lines (4px cycle, 6% opacity) over the canvas.
- **Slot activation glow** — diagonal gradient highlight on filled hull slots.

## Rocket Construction Layout

### Screen Split
- **Mobile**: Top ~65% is the blueprint rocket canvas; bottom ~30% is the parts tray (fixed, no slide). The bottom panel holds the parts catalog, is always visible, and scrolls horizontally. Confirm Build sits in the panel footer.
- **Desktop** (≥821px): Two-column layout — left column is the rocket canvas + stats strip, right column (320px fixed) is the parts catalog stacked vertically. Same panel, different orientation.

### Top Bar
- Left: Level badge (circular icon + "Lv. N") + page title.
- Right: Currency balance with amber coin icon.
- Resource chips (steel/silicon/platinum) are shown per-part-variant in the parts tray, not in the top bar.

## Part Variant System

Each of the 4 hull slots accepts one **variant** from its type group. Multiple variants exist per type, unlocked by player progression.

| Type | Slot | Variants | Stats |
|---|---|---|---|---|
| Payload | payload | V1 (tier 1), V2 (tier 2), V3 (tier 3) | Cargo |
| Fuel | fuel | V1 (tier 1), V2 (tier 2), V3 (tier 3) | Range |
| Engine | engine | V1 (tier 1), V2 (tier 2), V3 (tier 3) | Drill, Speed |
| Structure | structure | V1 (tier 1), V2 (tier 2), V3 (tier 3) | Orbit, Durability |

V3 parts cost gold/ice — premium resources introduced at tier 3.
Tier 3 parts are locked by default, unlocked through progression.

### Variant Cards
Each variant card in the parts tray shows:
- **Icon** — distinct SVG per variant (8 total icons: payload-v1/v2, fuel-v1/v2, engine-v1/v2, frame-v1/v2)
- **Tier badge** — small numbered circle (top-right of icon) for tier 2+ parts
- **Name** — e.g. "Payload V1"
- **Cost** — inline resource chips (steel/silicon/platinum)
- **Action** — "Add" button (click to install) or green checkmark "Added" (if installed)
- **Locked state** — dimmed with lock icon, not clickable, not draggable

### Interaction
- **Click Add** on a variant card installs it into its corresponding hull slot.
- **Drag** a variant card onto the hull slot to install (HTML5 drag-and-drop).
- **Click** an installed slot on the hull to remove the part (shows a red × on hover).
- Installing a new variant in an occupied slot replaces the old variant (no flash/error).
- The Confirm Build button in the panel footer is disabled when 0 parts are installed.

## Part Icon Reference

12 distinct SVG icons, all 24×24 viewBox, stroke-width 1.5:

| ID | Part | Description |
|---|---|---|
| `i-pv1` | Payload V1 | Rect crate with center cross |
| `i-pv2` | Payload V2 | Double-walled rect with inner box and full cross |
| `i-pv3` | Payload V3 | 2×2 modular compartment grid, large cargo bay |
| `i-fv1` | Fuel V1 | Small cylinder with top neck |
| `i-fv2` | Fuel V2 | Large cylinder with reinforced bands and base |
| `i-fv3` | Fuel V3 | Dual cryo tanks with connecting pipe and vent lines |
| `i-ev1` | Engine V1 | Trapezoid nozzle with exhaust ports |
| `i-ev2` | Engine V2 | Wide nozzle with circular chamber and side vents |
| `i-ev3` | Engine V3 | Ion drive — wide bell path with ion grid indicators |
| `i-sv1` | Frame V1 | Diagonal truss structure with cross-braces |
| `i-sv2` | Frame V2 | Reinforced hexagonal frame with central hub |
| `i-sv3` | Frame V3 | Double honeycomb frame with inner reinforcement ring |

## Interaction Logic

Grounded from `MissionBoardScreen.tsx` / `MiningScreen.tsx` / `useGameLoop.ts`:
- Client-vs-freeform mission split
- Locked/cooldown/completed states shown disabled, never hidden
- Two-leg delivery must be shown before commit
- Payout premium never mines more cargo
- Confirm Action Sheet gates every irreversible action
