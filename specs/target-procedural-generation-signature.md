# Target Procedural Generation Signature

**Status:** Implementation-ready
**Task:** @task-ckkmi6

## Overview

This spec defines the procedural generation signature for mining targets (asteroids,
planetoids) in Landnam. "Target" refers to any destination body the player flies to
for a mining mission. The signature is the deterministic set of inputs that fully
describes a target's visual appearance and mineral composition.

## Generation inputs

```ts
interface TargetSignature {
  seed: number;          // deterministic RNG seed (derived from target ID)
  tier: 1 | 2 | 3;      // mission tier controls size and richness
  biome: 'rocky' | 'icy' | 'metallic' | 'carbonaceous';
  radius: number;        // kilometres (affects sprite scale)
}
```

`seed` is derived from the target's catalog ID using a stable hash so the same
target always generates the same appearance across sessions.

## Visual outputs

| Field | Description |
|---|---|
| `baseColor` | HSL hue bucket from biome palette |
| `craterCount` | `floor(seed % 4) + tier` |
| `surfaceNoise` | 0–1 float controlling surface texture roughness |
| `highlightColor` | accent color from mineral composition |

Visual generation is handled by `SpriteGenerator` in
`tools/ruby-asset-pipeline/lib/sprite_generator.rb` for offline PNG output.
The PixiJS canvas renderer (`web/components/game/`) applies the same parameters
at runtime for animated views.

## Mineral composition

Mineral yields are sampled from a weighted distribution keyed by `biome`:

| Biome | Primary minerals | Rare mineral chance |
|---|---|---|
| rocky | iron, silicate | 5% carbon |
| icy | water-ice, ammonia | 8% noble gases |
| metallic | iron, nickel | 15% platinum-group |
| carbonaceous | carbon, organics | 12% amino-precursors |

`seed % 100 < rareChance` determines whether the rare mineral slot is populated.

## Implementation tasks identified

1. **Extend `SpriteGenerator`** — accept `TargetSignature` as input and vary crater
   count, surface noise, and highlight color deterministically.
2. **Add `generateTargetSignature(targetId: string): TargetSignature`** in
   `web/lib/data.ts` — stable hash from ID to seed.
3. **Wire composition into `MineralDrop`** in game-context to use biome weights
   rather than flat random.

## References

- `tools/ruby-asset-pipeline/lib/sprite_generator.rb` — sprite generation
- `web/lib/data.ts` — MINERAL_META and static target data
- `web/game-context.tsx` — mineral drop logic
