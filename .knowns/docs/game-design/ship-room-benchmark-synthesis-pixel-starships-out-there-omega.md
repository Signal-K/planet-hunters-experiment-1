---
title: Ship-Room Benchmark Synthesis (Pixel Starships + Out There Omega)
createdAt: '2026-03-07T01:41:38.847Z'
updatedAt: '2026-03-07T01:42:03.012Z'
description: >-
  External room/module design patterns translated into Planet Hunters interior
  room prompt and interaction strategy
---
# Ship-Room Benchmark Synthesis (Pixel Starships + Out There Omega)

Purpose: capture transferable room/module patterns from comparable games, then map them to Planet Hunters' current loop and interior zoom system.

Related docs:
- @doc/game-design/room-sprite-gpt-prompts
- @doc/game-design/room-component-prompt-system-for-rocket-interiors
- @doc/game-design/mission-system-specification
- @doc/game-design/level-progression-and-unlocks

## Sources

Primary references consulted:
- Pixel Starships official site: https://pixelstarships.com/
- Pixel Starships on Steam (PSS2 update notes mention oxygen/doors + room interactions): https://store.steampowered.com/app/378760/Pixel_Starships/
- Pixel Starships community wiki (room and systems breakdown): https://pixelstarships.fandom.com/wiki/Rooms
- Out There: Omega Edition on Steam: https://store.steampowered.com/app/334420/Out_There__Edition/
- Out There (video game) overview: https://en.wikipedia.org/wiki/Out_There_(video_game)

Inference notes:
- Community wiki details are treated as directional patterns, not strict authoritative specs.
- Out There module-level room taxonomy is inferred from gameplay systems (resource survival + ship specialization), since published room-by-room schematics are limited.

## Comparative Patterns

### 1) Pixel Starships patterns relevant to Planet Hunters

- Cross-section ship identity: interior room layout is core to player strategy and readability.
- Function-first room taxonomy: propulsion, reactor/power, storage, command/scanner, support.
- Room state legibility: active/offline/damaged states are visible from room visuals.
- Placement strategy: room adjacency and ship topology affect outcomes; not all space is equivalent.
- Upgrade readability: higher-tier rooms are visibly denser, cleaner, and higher-energy.

Direct fit for Planet Hunters:
- Keep room silhouettes iconic at small size.
- Prioritize strong state deltas (idle vs active vs damaged vs depleted).
- Keep tier progression visually obvious even before user clicks.

### 2) Out There: Omega patterns relevant to Planet Hunters

- Survival-loop clarity: fuel/oxygen/hull/repair pressures shape decisions each run.
- Ship identity by specialization: different hulls and module capacity produce distinct playstyles.
- Event-risk framing: system status drives narrative outcomes and strategic pacing.
- Resource triad gameplay: extraction efficiency must be balanced against survivability and return.

Direct fit for Planet Hunters:
- Emphasize per-run wear/depletion visuals on mining and fuel/power components.
- Surface risk state in rooms (warning lights, thermal stress, low reserves) before hard failure.
- Use ship-type batching so generated art mirrors functional differences in the game loop.

## Planet Hunters Mapping (Current Code + Specs)

Current room model (`RoomCatalog.gd`) already aligns with benchmark patterns:
- Rocket-type layouts: `starterrocket1`, `starterrocket2`, `starterrocket3`
- Category/tier model: propulsion, power, fuel, storage, mining, navigation, hull, science, communication, life_support
- Bay restrictions: utility-only expansion area, capacity gating
- State hooks: offline upgrade state and consumable parachute

Current mission/level loop alignment:
- M1/L1: core launch-mine-return loop, starter rooms
- M2/L2: upgrade loop, stronger propulsion/fuel/science/comms
- M3/L2: scanner-introduction phase; room UI should highlight navigation systems
- M4/L3: planetary range + advanced room complexity
- M5/L3: contractor optimization; stateful visuals matter for decision feedback

## Recommended Shape/Component Direction

Ship interior shape language for generated assets:
- Default room tile silhouette: 2:1 module for readability and atlas consistency
- Component silhouette classes:
  - pillar/cylinder (reactors, tanks)
  - armature/mechanical limb (drills, robotic arms)
  - panel/console (navigation/comms)
  - rack/bank (capacitors, storage)
- Tier progression visual grammar:
  - T1: sparse utilitarian hardware
  - T2: denser wiring, cleaner casing, more displays
  - T3: compact high-energy forms, advanced glow signatures

State grammar (must remain consistent across all rooms):
- idle: stable low-intensity emissives
- active: brighter emissives + mild motion cues
- cooldown: venting/decay cues
- damaged: fracture/scorch/spark cues
- depleted: darkened core + warning-only indicators
- usage tiers: progressive wear overlays for per-run history

## Gaps Identified vs Current Prompt Coverage

Coverage gaps to resolve in next prompt pass:
- `reinforced_hull_t2` exists in `RoomCatalog`, but prompt pack currently uses `ablative_armour_t3` instead.
- `life_support_t3` and `crew_quarters_t3` exist in `RoomCatalog` but are not yet represented in the component prompt system.
- Some mission-era gameplay (scanner unlock at M3) benefits from earlier generation of navigation-state variants despite SR2 layout.

## Decision Summary

Use Pixel Starships-inspired spatial/state legibility and Out There-inspired run-risk signaling as the combined visual strategy:
- Spatial legibility for dollhouse room navigation.
- Resource/wear legibility for run-based decisions.
- Ship-type and mission-level batching for production order.

