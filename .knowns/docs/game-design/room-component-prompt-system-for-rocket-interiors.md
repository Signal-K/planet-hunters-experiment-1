---
title: Room Component Prompt System for Rocket Interiors
createdAt: '2026-03-07T01:22:37.272Z'
updatedAt: '2026-03-10T08:56:38.794Z'
description: >-
  Legacy component prompt reference; active source of truth is
  specs/unified-room-image-generation-super-sheet-slicing-plan
---
# Room Component Prompt System (Rocket Interiors)

Purpose: define a component-first generation workflow so each room is assembled from reusable visual parts, with per-run stateful variants for clickable/interactable gameplay objects.

This complements @doc/game-design/room-sprite-gpt-prompts (full-room prompts). Use this doc to generate parts first, then compose room tiles.

## Core Rule: Style Anchor First

1. Generate the style anchor image first using the anchor prompt below.
2. For every other prompt in this doc, attach that anchor image in ChatGPT (paperclip).
3. Include: `match this style exactly`.
4. If drift appears, add: `match the exact same illustration style, line weight, colour temperature, and background as the reference image`.

### Style Anchor Prompt

```text
Side-view cross-section cutaway of a single spacecraft interior room module. Illustrated sci-fi game asset style — clean detailed linework, metallic silver-grey interior walls with visible panel seams and riveted bolts, recessed floor lighting strips, equipment glowing with coloured sci-fi accent lights. Dark background (#0D0B14 deep space purple, near-black). No text, no labels, no UI. The module is a rectangular tile — flat top and bottom edges so it can stack with other modules. Landscape 2:1 ratio. Consistent illustrated style like a mobile space exploration game concept art, similar to how Pixel Starships looks but rendered in a modern illustrated style rather than retro pixel art. Single module only, no rocket exterior visible.
```

## Generation Pipeline (Component-First)

1. Generate `shell kit` once (empty room shell variants with no major equipment).
2. Generate each room's `component kit` as isolated assets.
3. Generate `state variants` for each interactive component.
4. Compose a room tile from shell + components using a composition prompt.
5. Export/organize into a manifest for Godot (sprite IDs, anchors, hitboxes, states).

Use this quality clause on all prompts:

```text
mid-level detail — readable at 128x64px
```

## Prompt Templates

### 1) Component Prompt Template

```text
Using the attached style reference, create a single isolated room component sprite for a spacecraft dollhouse interior system. Component: {component_name}. Category: {room_name}. Visual description: {description}. Lighting accents: {accent_colors}. Side-view cross-section perspective, clean cutout silhouette, no text, no labels, no UI, no characters. Keep same line weight/material language/background behavior as reference. Designed for 2:1 room tile composition workflow.
```

### 2) Stateful Variant Prompt Template

```text
Using the attached style reference and matching the base component exactly, create state variant `{state_key}` for component `{component_name}` in `{room_name}`. Change only state cues: {state_visual_changes}. Preserve camera, scale, style, line weight, and material details. No text, no labels, no UI.
```

### 3) Room Composition Prompt Template

```text
Using the attached style reference, compose one 2:1 spacecraft room tile for `{room_name}` using these components: {ordered_component_ids}. Keep module shell rectangular with flat top/bottom for stacking. Include only listed components and consistent accent lighting. No text, no labels, no UI, no rocket exterior.
```

## State Model (Per-Run Gameplay)

For any clickable gameplay component (example: mining laser/drill, probes, drones, reactor switchgear), generate these states where relevant:

- `idle`
- `active`
- `cooldown`
- `damaged`
- `depleted` or `empty`
- `upgraded_t2` (optional progression)
- `upgraded_t3` (optional progression)

Suggested usage-driven wear mapping (per run):

- `usage_0_24`: clean, low heat
- `usage_25_49`: mild scorch/wear
- `usage_50_74`: visible heat bloom, scratches
- `usage_75_99`: heavy wear, warning glow
- `usage_100`: near-failure/depleted visual

## Manifest Format Proposal (Godot-ready)

```json
{
  "room_id": "mining_drill_room_t1",
  "tile_size": { "w": 1024, "h": 512 },
  "components": [
    {
      "id": "drill_arm_main",
      "type": "interactive",
      "anchor": { "x": 0.58, "y": 0.56 },
      "z": 40,
      "hitbox": { "x": 530, "y": 220, "w": 220, "h": 170 },
      "states": ["idle", "active", "cooldown", "damaged", "depleted", "usage_0_24", "usage_25_49", "usage_50_74", "usage_75_99", "usage_100"]
    },
    {
      "id": "deploy_terminal",
      "type": "interactive",
      "anchor": { "x": 0.82, "y": 0.44 },
      "z": 45,
      "hitbox": { "x": 760, "y": 170, "w": 180, "h": 150 },
      "states": ["idle", "active", "damaged"]
    }
  ]
}
```

## Room-by-Room Component Inventory

Each room lists `structural`, `interactive`, and `stateful targets`.

### Propulsion

#### Basic Thruster Room
- Structural: right-wall nozzle mount, floor/wall fuel pipes, worn metal paneling.
- Interactive: rocket nozzle assembly, 2-dial thrust control panel.
- Stateful targets: nozzle flame intensity, panel dial glow, pipe heat tint.

#### Fusion Drive Room
- Structural: central chamber cradle, magnetic containment rings, cooling pipe network.
- Interactive: plasma chamber core, monitoring terminal.
- Stateful targets: core brightness/stability, ring glow, terminal alert state.

#### Ion Drive Room
- Structural: ion thruster housing, electromagnetic coil casing, canister rack.
- Interactive: ion thruster array, precision computer terminal, xenon canister manifold.
- Stateful targets: exhaust plume strength, coil charge glow, canister fill level, terminal status.

### Power / Reactor

#### Small Reactor Core Room
- Structural: reinforced cylindrical housing, wall conduit trunk lines.
- Interactive: compact reactor core sphere, two indicator/control panels, output terminal.
- Stateful targets: reactor sphere intensity, panel warning states, conduit pulse brightness.

#### Fusion Reactor Room
- Structural: containment vessel frame, reinforced glass window, thick conduit trunks, bolted floor.
- Interactive: magenta energy orb, multi-screen monitoring station.
- Stateful targets: orb instability/charge, monitor alert mode, conduit thermal glow.

#### Power Capacitor Room
- Structural: capacitor rack frame, ceiling cable runs.
- Interactive: capacitor cell bank, central discharge switch panel.
- Stateful targets: per-cell charge fill, switch armed/discharge state, inter-cell electrical crackle.

### Fuel

#### Small Fuel Tank Room
- Structural: dual tank mounts, floor fuel line routing.
- Interactive: two cylindrical tanks, pressure gauges, valve panel, frosted fuel viewport.
- Stateful targets: fuel level in viewport, gauge needles, valve open/closed.

#### Large Fuel Tank Room
- Structural: heavy wall brackets, pump base assembly, warning stripe zone.
- Interactive: main tank body, pumping equipment, pressure readout cluster, large viewport.
- Stateful targets: fuel fill level, pump active state, pressure warning lights.

### Storage / Cargo

#### Cargo Bay Room
- Structural: floor cargo anchor grid, ceiling rail.
- Interactive: ore crates, specimen containers with magnetic clamps, ceiling robotic arm, inventory terminal.
- Stateful targets: crate occupancy, clamp lock lights, robotic arm pose, terminal inventory activity.

#### Pressurised Resource Vault Room
- Structural: sealed rack system, gasketed container slots.
- Interactive: reinforced containers, circular vault door, environmental control unit, status indicators.
- Stateful targets: container occupancy, door lock state, pressure/atmosphere status.

### Mining / Extraction

#### Mining Drill Room
- Structural: drill mount frame, floor dampener pads, hatch seams.
- Interactive: folded drill arm, exposed drill bit, cable drum, deployment control terminal, floor hatch.
- Stateful targets: drill wear by usage tier, cable remaining, hatch open/closed, terminal active/warning.

#### Subsurface Probe Room
- Structural: launch tube housing, floor launch doors.
- Interactive: probe body, folded antennae, targeting terminal.
- Stateful targets: probe loaded/spent, antenna deployed state, terminal target lock confidence, door state.

#### Mining Drone Bay Room
- Structural: drone rack/cradle mounts, floor launch hatch seams.
- Interactive: three mining drones, charging cables, launch terminal, floor hatch.
- Stateful targets: drone slot occupied/empty, charge level LEDs, hatch open/closed, terminal launch cooldown.

### Navigation / Scanner

#### Basic Navigation Room
- Structural: nav console station, right-side viewport frame.
- Interactive: holographic star map emitter, radar sweep display, manual flight controls.
- Stateful targets: map zoom/selection glow, radar sweep intensity, control activation state.

#### Scanner Array Room
- Structural: dual terminal stations, dish connection ports.
- Interactive: central anomaly hologram, rotating sweep side screen, operator seat (optional interactable).
- Stateful targets: scan cycle phase, anomaly lock state, terminal sync/alert.

#### Spectral Analyser Room
- Structural: central plinth, sample tray rail.
- Interactive: spectral splitter prism, composition band display, sample trays, spectrograph screen.
- Stateful targets: prism emission mode, spectrum profile variation, tray occupancy, analysis progress.

### Hull / Armour

#### Basic Hull Plating Module
- Structural: layered armour wall, reinforcement struts.
- Interactive: inspection access panel, damage indicator strip.
- Stateful targets: damage strip level, panel open/closed, plating wear state.

#### Ablative Armour Module
- Structural: composite multi-layer wall, heat dissipation fins.
- Interactive: nano-repair node array, self-diagnostics panel.
- Stateful targets: repair node activity, diagnostics health score state, ablative layer erosion.

### Science / Lab

#### Sample Analysis Lab Room
- Structural: central workbench, wall vial rack.
- Interactive: specimen trays, microscope arm, two sealed containment tubes, composition readout screen.
- Stateful targets: specimen present/absent, tube glow intensity, microscope active/inactive, readout progress.

#### Telescope Observation Room
- Structural: long telescope mount, sealed roof aperture housing.
- Interactive: telescope tube, data recording station, circular star-chart display, observer chair (optional interactable).
- Stateful targets: telescope aim preset, aperture open/closed, recording active state, chart highlight mode.

### Communications

#### Comms Relay Room
- Structural: antenna diagram panel zone, ceiling booster mount.
- Interactive: transmission console, waveform display, rotating dish mechanism (through porthole), booster components.
- Stateful targets: signal strength bands, dish tracking motion phase, booster online/offline.

#### Broadcast Array Room
- Structural: wall schematic zone, rack bay frame.
- Interactive: phased-array schematic display, signal processing rack, waveform monitor bank, directional joystick.
- Stateful targets: channel load, monitor activity cluster, joystick target lock state.

## Batch Generation Order (Practical)

1. Anchor image: 1 output, pick best.
2. Shell kit: 3 variants (starter, mid, high density).
3. Component kit: generate all interactive components first per room.
4. State kit: generate variants only for interactive components used in gameplay logic.
5. Room composites: assemble per room, then polish.
6. Import + manifest: attach IDs, anchors, hitboxes, states.

## Prompt Footer for Every Generation

Append this line to every prompt after attaching anchor image:

```text
match this style exactly; side-view cutaway module language; no text/no labels/no UI; consistent line weight and colour temperature with reference.
```

## Notes

- Rooms are only visible in interior zoom (dollhouse view), so prioritize readability and silhouette over micro-detail.
- Keep each component visually separable for click targets and state swaps.
- Parachute module remains an item icon/slot, not a persistent room tile.


### Reinforced Hull Module (T2)
- Structural: reinforced bulkhead segments, impact dampener ribs, composite bracing frame.
- Interactive: stress monitor display, microfracture sensor array.
- Stateful targets: structural stress trend, microfracture alert severity.

### Life Support Core Room (T3)
- Structural: air recycler column, atmosphere duct grid, humidity control manifold.
- Interactive: oxygen scrubber bank, environment console, CO2 filter cartridge rack.
- Stateful targets: scrubber wear, atmosphere stability, filter depletion.

### Crew Quarters Module (T3)
- Structural: bunk stack frame, privacy partition walls, personal storage lockers.
- Interactive: bunk lighting controls, crew status terminal, hydration station.
- Stateful targets: occupancy/activity cues, terminal alert states, resource depletion cues.



## 2026-03-10 Contractor Theming Addendum
- Contractor style is applied per mission and per rocket.
- Allowed contractor channels: trims, decals, signage motifs, and accent lighting variants.
- Do not alter functional silhouettes used for interaction hit readability.
- Wear progression remains subtle and persists per rocket across runs.
- Use rules in @doc/specs/contractor-visual-theming-rules-for-room-prompt-production when generating M4/Free Ops batches.



## Consolidation Status (2026-03-10)
This document is now reference-only.
Use this active source of truth:\n@doc/specs/unified-room-image-generation-super-sheet-slicing-plan
