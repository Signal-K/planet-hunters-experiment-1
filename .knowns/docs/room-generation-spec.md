---
labels:
  - project-landnam
---

# Room Generation Specification

This document consolidates the prompting and generation workflows for spacecraft interior rooms, incorporating benchmark synthesis from Pixel Starships and Out There: Omega.

## Overview
Purpose: Define a component-first generation workflow where each room is assembled from reusable visual parts, with per-run stateful variants for interactive gameplay objects.

## Style Anchor
Generate the style anchor image first. For all subsequent prompts, attach this anchor and specify "match this style exactly."

**Style Anchor Prompt:**
> Side-view cross-section cutaway of a single spacecraft interior room module. Illustrated sci-fi game asset style — clean detailed linework, metallic silver-grey interior walls with visible panel seams and riveted bolts, recessed floor lighting strips, equipment glowing with coloured sci-fi accent lights. Dark background (#0D0B14 deep space purple, near-black). No text, no labels, no UI. The module is a rectangular tile — flat top and bottom edges so it can stack with other modules. Landscape 2:1 ratio. Consistent illustrated style like a mobile space exploration game concept art, similar to how Pixel Starships looks but rendered in a modern illustrated style rather than retro pixel art. Single module only, no rocket exterior visible.

## Generation Pipeline
1. **Shell Kit:** Empty room shell variants (starter, mid, high density).
2. **Component Kit:** Isolated assets for each room (interactive, structural).
3. **State Variants:** Interactive component states (idle, active, cooldown, damaged, depleted, usage-driven wear).
4. **Composition:** Assemble room tiles from shell + components.
5. **Manifest:** Export sprite IDs, anchors, hitboxes, and states for Godot.

## Quality Standards
- Mid-level detail: Readable at 128x64px.
- Side-view cutaway perspective.
- No text, labels, or UI.
- Consistent line weight and color temperature.
- Transparent background (PNG).

## State Model
Clickable gameplay components should have the following states:
- `idle`, `active`, `cooldown`, `damaged`, `depleted`.
- Usage-driven wear (per run):
  - `usage_0_24`: clean
  - `usage_25_49`: mild wear
  - `usage_50_74`: visible heat/scratches
  - `usage_75_99`: heavy wear
  - `usage_100`: near-failure

## Benchmark Synthesis
- **Pixel Starships:** Spatial/state legibility, function-first taxonomy, upgrade readability.
- **Out There: Omega:** Resource/wear legibility, run-risk signaling, ship identity by specialization.

## Batch Index
1. `batch_l1_m1_starterrocket1` (Starter rooms: thruster, reactor, tank, cargo, drill, nav, hull)
2. `batch_l2_m2_starterrocket2` (Adds fusion drive, large tank, lab, comms)
3. `batch_l2_m3_starterrocket2` (Scanner intro focus)
4. `batch_l3_m4_starterrocket3` (Adds drone bay, telescope, broadcast)
5. `batch_l3_free_ops_starterrocket3` (Contractor loop optimization)
6. `batch_advanced_rnd_t3_and_future` (Ion drive, spectral analyzer, etc.)
7. `batch_usage_state_variants_all_rooms` (Polish pass for wear system)

## Contractor Theming
- Applied per mission/rocket.
- Channels: trims, decals, signage, accent lighting.
- Do not reduce interactable readability.

---
*Last Updated: 2026-03-12*

# Room Generation Specification (Godot-Oriented)

This document defines a **small-scale, modular generation workflow** for spacecraft interior rooms used in a **2D / 2.5D side-view game in Godot**. The goal is to generate a **minimal but expandable asset set** consisting of:

- A small set of **room shells**
- A small set of **reusable components**
- **3 upgrade levels per room**
- Optional **state variants for wear and usage**

The system is designed so rooms are **assembled inside Godot** using reusable components rather than generating full rooms each time.

---

# Godot Orientation Rules

All generated images must follow strict camera rules so assets align correctly in Godot.

Camera
- Fixed **orthographic side view**
- Perfect **horizontal perspective (no tilt)**
- Objects face **left-to-right interior orientation**

Canvas
- Landscape **2:1 ratio**
- Target readability at **128x64px**

Alignment
- Objects sit on a **flat floor plane**
- Bottom of image = **room floor anchor**

Godot Anchor Recommendation

```
anchor: bottom_center
```

This allows components to snap to the room floor easily.

Export Format

```
PNG
transparent background
```

---

# Style Anchor (Generate First)

Generate a single canonical style image. Every other prompt should include this reference and say **"match this style exactly"**.

Style Anchor Prompt:

Side-view cross-section cutaway of a spacecraft interior room module.

Illustrated sci-fi game asset style with:
- clean detailed linework
- metallic silver-grey interior walls
- panel seams and riveted bolts
- recessed floor lighting strips
- glowing sci-fi accent lights

Background: deep space purple #0D0B14.

The module is a **rectangular tile** with flat top and bottom edges so modules can stack vertically.

Camera: orthographic side view.

Landscape 2:1 ratio.

No text, labels, UI, or characters.

Single room module only.

---

# Generation Pipeline

1. Style Anchor
2. Room Shell Kit
3. Component Kit
4. Upgrade Variants (Level 1–3)
5. Optional Usage / Wear States

Rooms are assembled in Godot using:

```
Room = Shell + Components
```

---

# Initial Asset Scope (Minimal Start)

Start with **4 rooms**, each with **3 upgrade levels**.

Rooms:

```
thruster_room
reactor_room
cargo_bay
navigation_room
```

Each room contains **3–5 components**.

---

# Room Shell Kit

Shells are reusable backgrounds.

Generate these first.

## starter_shell

Prompt:

Match the attached style reference exactly.

Create an empty spacecraft interior room shell.

Features:
- metallic interior wall panels
- recessed floor lighting strip
- ceiling conduits
- minimal structural frames

Side-view orthographic cutaway.

Flat floor line at bottom of frame.

Landscape 2:1 ratio.

Transparent background.

No text or UI.

---

## industrial_shell

Prompt:

Match the attached style reference exactly.

Create a heavy industrial spacecraft room shell.

Features:

- reinforced bulkheads
- thicker panel seams
- exposed piping mounts
- warning light strips

Side-view orthographic cutaway.

Flat floor line.

Landscape 2:1 ratio.

Transparent background.

No text or UI.

---

## science_shell

Prompt:

Match the attached style reference exactly.

Create a clean scientific spacecraft room shell.

Features:

- smooth panel surfaces
- subtle lighting
- instrument mounts
- cable conduits

Side-view orthographic cutaway.

Flat floor line.

Landscape 2:1 ratio.

Transparent background.

No text or UI.

---

# Component Generation

Components are reusable objects placed inside shells.

All components must:

- sit on the floor plane
- maintain consistent scale
- use transparent background

Prompt Template

Match the attached style reference exactly.

Create a spacecraft interior component.

Object: [component name]

Side-view orthographic sci-fi machinery.

Clean detailed linework.

Metallic materials with subtle glowing indicator lights.

The object sits on a flat floor plane.

Transparent background.

No room walls visible.

No text or UI.

---

# Room Component Sets

## Thruster Room

Components:

```
rocket_nozzle
fuel_injector_manifold
coolant_pipe_cluster
thrust_control_console
```

---

## Reactor Room

Components:

```
fusion_core
energy_regulator_rack
plasma_conduit_ring
reactor_control_terminal
```

---

## Cargo Bay

Components:

```
ore_crate_stack
robotic_cargo_arm
specimen_container_rack
cargo_clamp_floor_unit
```

---

## Navigation Room

Components:

```
manual_flight_controls
star_chart_console
gyro_stabilizer_unit
navigation_sensor_array
```

---

# Upgrade Variants

Each component should have **three upgrade tiers**.

```
t1_basic
t2_improved
t3_advanced
```

Upgrade cues:

Level 1
- simple machinery

Level 2
- additional modules
- extra lighting

Level 3
- complex machinery
- glowing energy systems

Prompt Example

Match the attached style reference exactly.

Create an upgraded spacecraft component.

Component: Rocket Nozzle
Upgrade Level: T2

Add additional fuel lines and improved heat shielding.

Do not change camera angle or scale.

Transparent background.

No text or UI.

---

# Optional Usage States

Used for runtime wear.

States:

```
usage_0_24
usage_25_49
usage_50_74
usage_75_99
usage_100
```

Prompt Template

Match the attached style reference exactly.

Create a usage state variant.

Component: Rocket Nozzle
State: usage_75_99

Change only wear indicators:

- scorch marks
- scratches
- warning glow

Do not change shape or scale.

Transparent background.

No text or UI.

---

# Godot Assembly Structure

Example scene layout

```
ThrusterRoom

Sprite2D (room_shell)

Node2D components

rocket_nozzle
fuel_injector
coolant_pipes
control_console
```

Recommended structure

```
rooms/
components/
states/
```

---

# Initial Asset Count

Minimal starting set

```
3 shells
4 rooms
4 components each
3 upgrade levels
```

Total base assets

```
3 shells
16 components
48 upgrade variants
```

Usage variants can be generated later.

---

*Last Updated: 2026-03-14*