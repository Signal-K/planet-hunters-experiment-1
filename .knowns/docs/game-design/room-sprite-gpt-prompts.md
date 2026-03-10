---
title: Room Sprite GPT Image Prompts
createdAt: '2026-03-10T08:50:09.844Z'
updatedAt: '2026-03-10T08:56:38.807Z'
description: >-
  Legacy full-room prompt catalog; active source of truth is
  specs/unified-room-image-generation-super-sheet-slicing-plan
---
# Room Sprite GPT Image Prompts

Prompts for generating the interior room module sprites for the dollhouse/cross-section view of the rocket.

The rooms are only visible when the player zooms into the rocket — the exterior looks like a normal rocket, and on zoom the interior is revealed as a side-view cross-section (Pixel Starships-style). Each room is a rectangular tile that slots into the rocket's internal hull grid.

**Style reference:** matches the illustrated sci-fi concept art style of the existing `ControlStation.png` and `launchpad.png` assets — not retro pixel art, but clean detailed linework with dark backgrounds and coloured equipment glow. Nebula colour palette: deep purple/black backgrounds, cyan, pink, orange, and white accents.

---

## How to use these prompts

1. Generate the **Style Anchor** image first.
2. For every subsequent room prompt, **attach the style anchor image as a reference** (paperclip in ChatGPT) and add *"match this style exactly"* to the prompt.
3. If a room looks wrong, add: *"match the exact same illustration style, line weight, colour temperature, and background as the reference image."*
4. For **transparent background** (needed for Godot): add *"PNG with transparent background, no drop shadow"* — may need manual masking in post.
5. If detail level is off: add *"mid-level detail — readable at 128×64px"*

---

## Style Anchor Prompt

Run this first. Use the result as a reference image for all room prompts.

```
Side-view cross-section cutaway of a single spacecraft interior room module. Illustrated sci-fi game asset style — clean detailed linework, metallic silver-grey interior walls with visible panel seams and riveted bolts, recessed floor lighting strips, equipment glowing with coloured sci-fi accent lights. Dark background (#0D0B14 deep space purple, near-black). No text, no labels, no UI. The module is a rectangular tile — flat top and bottom edges so it can stack with other modules. Landscape 2:1 ratio. Consistent illustrated style like a mobile space exploration game concept art, similar to how Pixel Starships looks but rendered in a modern illustrated style rather than retro pixel art. Single module only, no rocket exterior visible.
```

---

## Propulsion

**Basic Thruster Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A compact engine room — a single rocket nozzle on the right wall venting a low orange exhaust flame, simple fuel pipes running along the floor and walls, a basic 2-dial thrust control panel with orange glow. Industrial, utilitarian, worn metal. Starter-tier: minimal equipment, functional. Orange-amber accent lighting.
```

**Fusion Drive Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A fusion drive engine room — a central cylindrical plasma chamber with a bright blue-white glow at its core, magnetic containment rings around it, cooling pipes running to the walls, a small monitoring terminal with waveform readouts. Blue-white accent lighting, the chamber dominates the room. Mid-tier — cleaner and more advanced than a basic thruster.
```

**Ion Drive Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. An ion drive room — a sleek ion thruster array along the right wall emitting a soft deep-blue ion exhaust plume, xenon gas canisters stacked on the left, a precision computer terminal, electromagnetic coils visible on the thruster housing. Cool deep-blue and electric purple accent lighting. High-tier — elegant and efficient-looking.
```

---

## Power / Reactor

**Small Reactor Core Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A small reactor power room — a compact reactor core at centre, a glowing purple-cyan energy sphere inside a reinforced cylindrical housing, power conduit cables running along the walls to output terminals, indicator lights on two small panels. Deep purple and cyan glow. Starter-tier: compact, utilitarian.
```

**Fusion Reactor Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A large fusion reactor room — a dominant plasma containment vessel at centre, a bright magenta-pink energy orb visible through reinforced glass, thick power conduits running to both walls, a multi-screen monitoring station showing energy output graphs, reinforced floor bolts. Rich pink-magenta glow fills the room. Mid-tier — powerful and impressive.
```

**Power Capacitor Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A power capacitor room — a bank of large cylindrical capacitor cells mounted in a rack on the left, energy charge indicators glowing amber-yellow on each cell, a central discharge switch panel, cable runs along the ceiling. Warm amber-gold accent lighting, slight electrical crackle effect between cells. Mid-tier.
```

---

## Fuel

**Small Fuel Tank Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A small fuel tank room — two cylindrical fuel tanks mounted side by side, pressure gauges on each, fuel lines running along the floor, a simple valve panel, a small frosted-glass viewport showing blue liquid fuel inside the tanks. Cool blue accent lighting. Starter-tier — simple and compact.
```

**Large Fuel Tank Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A large fuel tank room — one massive cylindrical tank filling most of the space, reinforced wall mounting brackets, automated pumping equipment at the base, multiple pressure readouts, a yellow warning stripe painted on the tank, a large frosted viewport revealing deep blue liquid. Dominant cool-blue ambient lighting. High-capacity, slightly industrial.
```

---

## Storage / Cargo

**Cargo Bay Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A cargo bay room — stacked ore crates and specimen containers secured with magnetic clamps, a small robotic arm on the ceiling rail, a simple inventory terminal on the right wall, floor grid with cargo anchor points. Warm amber lighting, containers have small coloured indicator lights (green, amber). Starter-tier — practical and busy-looking.
```

**Pressurised Resource Vault Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A pressurised storage vault room — reinforced specimen containers in a sealed rack system, a thick circular vault door visible on one end, airtight gasket seals on each container, an environmental control unit on the wall, status indicators all glowing green. Cold white-blue sterile lighting, clinical and secure. High-tier.
```

---

## Mining / Extraction

**Mining Drill Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A mining drill room — a heavy industrial drill arm folded and stowed, drill bit visible at one end, a drum of drill cable on the wall, vibration dampener pads on the floor, a deployment control terminal with a deployment hatch below it (closed, with hatch seams). Orange-brown dust accent, equipment looks heavy and mechanical. Starter-tier.
```

**Subsurface Probe Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A subsurface probe deployment room — a torpedo-like probe stored in a horizontal launch tube, scanning antennae folded along its sides, a targeting computer terminal showing a cross-section terrain map, launch tube doors in the floor (closed). Cyan-green scanning display glow, amber status lights on the probe. Mid-tier.
```

**Mining Drone Bay Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A mining drone hangar bay — three compact boxy mining drones racked side by side in individual charge cradles, charging cables connected to each, a floor launch hatch (closed, with hatch seam lines), a launch control terminal on the right wall with a grid display. Drones have cyan charging indicator lights. Feels like a miniature hangar. Mid-to-high tier.
```

---

## Navigation / Scanner

**Basic Navigation Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A basic navigation room — a single nav console with a small holographic star map floating above it showing nearby planets, a simple radar sweep display, manual flight input controls, a viewport window on the right showing a star field. Blue-green holographic glow, clean and compact. Starter-tier.
```

**Scanner Array Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A scanner array room — two scanning terminals facing a central holographic anomaly display showing a waveform signature, wall-mounted dish connection ports, a rotating sensor sweep visualised on a side screen, an operator seat. Cyan and deep-purple glow from scanning displays, data-heavy and technical feel. Mid-tier.
```

**Spectral Analyser Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A spectral analyser room — a prism-like spectral splitter device on a central plinth, a colour spectrum readout display on the wall showing planetary composition bands, analytical sample trays, a spectrograph output screen. Rainbow spectral light splits across the room from the prism. High-tier — scientific and precise-looking.
```

---

## Hull / Armour

**Basic Hull Plating Module**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A hull plating structural module — thick layered armour panels visible on the outer wall, interior inspection access panel, structural reinforcement struts running floor to ceiling, a damage indicator strip on the plating. Muted grey-silver tones, minimal glow, purely structural. Starter-tier.
```

**Ablative Armour Module**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. An ablative armour module — multi-layer composite armour on the outer wall, a nano-repair system with glowing cyan repair nodes distributed across the plating, a self-diagnostics panel, reinforced interior with heat dissipation fins. Subtle cyan glow from the repair nodes. High-tier — expensive and advanced-looking.
```

---

## Science / Lab

**Sample Analysis Lab Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A sample analysis lab room — a central bench with specimen trays, a microscope arm, two sealed containment tubes holding glowing orange-purple mineral samples, a composition analysis readout screen on the wall, wall-mounted vial storage rack. Warm amber and nebula purple glow from specimens. Mid-tier — scientific, slightly cluttered with equipment.
```

**Telescope Observation Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A telescope observation room — a long telescope tube running the length of the space aimed up at a sealed roof aperture, a data recording station with a circular star-chart display, an observer's chair. Deep indigo-blue ambient lighting with a thin beam of starlight through the aperture lens. Calm and contemplative. Mid-tier.
```

---

## Communications

**Comms Relay Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A communications relay room — a transmission console with a signal waveform display, a wall diagram of the antenna array, a small rotating dish mechanism visible through a porthole viewport, signal booster components mounted on the ceiling. Cyan signal-wave glow on displays, clean and technical. Starter-tier.
```

**Broadcast Array Room**
```
Using the style reference: spacecraft interior room module, side-view cross-section, 2:1 landscape tile. A broadcast array room — a large phased-array antenna dish schematic taking up one wall, a high-fidelity signal processing rack, multiple waveform monitors, a directional control joystick for dish targeting. Stronger cyan and white glow, more equipment, more screens than the basic relay. Mid-tier.
```

---

## Notes

- The **parachute module** is a consumable item slot, not a persistent room — consider generating it as an item icon rather than a room tile.
- Once the first few rooms are generated and looking consistent, consider generating a **sheet of 4 rooms in one image** to test how they look side by side in the hull grid.
- The Nebula theme accent colours to stay consistent with: deep purple `#140D26`, nebula pink `#D9598C`, cyan `#40BFD9`, orange `#F2733D`, bright white `#F2F2FA`.



## Consolidation Status (2026-03-10)
This document is now reference-only for legacy full-room prompts.
Use this active source of truth:\n@doc/specs/unified-room-image-generation-super-sheet-slicing-plan
