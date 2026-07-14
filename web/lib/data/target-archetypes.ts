// Landnam game data — composition archetypes for targets.
//
// A target's mineral list is derived from its real-world-inspired spectral
// archetype + orbital distance, instead of being hand-picked per target.
// This is the single source of truth for "what can this body plausibly
// contain" — both the mineral/mission-compatibility logic (compatibleTargetsFor)
// and the orbital map's visual spectral classification (PixiGalaxyMap) read
// from it, so the two can never drift out of sync again.
//
// Grounding: C/S/M mirror real asteroid spectral taxonomy (carbonaceous,
// silicate/stony, metallic). Exact mineral content on any *named* real body
// is speculative — that's fine (nothing here claims to be a confirmed
// assay) — but every mineral assigned is a real element/compound that could
// plausibly occur there. No fictional elements, no physics-breaking claims.
export type TargetArchetype = 'C' | 'S' | 'M' | 'icy' | 'gas-giant'

interface ArchetypeMineralPool {
  common: string[]
  uncommon: string[]
  rare: string[]
  exotic: string[]
}

export const ARCHETYPE_LABELS: Record<TargetArchetype, string> = {
  C: 'Carbonaceous',
  S: 'Silicate',
  M: 'Metallic',
  icy: 'Icy',
  'gas-giant': 'Gas giant',
}

// Real-world grounding per archetype:
// - M (metallic): iron/nickel cores are real (16 Psyche is a genuine NASA
//   mission target hypothesized to be an exposed metallic core); siderophile
//   elements (gold, platinum-group metals) are real geochemical companions
//   of iron-nickel bodies, so a metallic body being unusually rich in them
//   is a plausible "jackpot" body, not a fictional stretch.
// - C (carbonaceous): real C-type/B-type bodies (Bennu, Ryugu, Ceres) carry
//   hydrated minerals, carbon compounds, and water ice — well documented by
//   OSIRIS-REx and Hayabusa2. Palladium/iridium content is speculative but
//   not implausible (carbonaceous chondrites found on Earth do carry trace
//   platinum-group metals).
// - S (silicate/stony): iron + silicate rock, the most common near-Earth
//   composition; trace heavy metals as a rarer find.
// - icy / gas-giant: water ice, light volatiles, trace heavier elements in
//   the surrounding system (moons, rings) — no metals expected at any tier.
const ARCHETYPE_POOLS: Record<TargetArchetype, ArchetypeMineralPool> = {
  M: {
    common: ['iron', 'nickel'],
    uncommon: ['cobalt', 'copper'],
    rare: ['gold', 'platinum'],
    exotic: ['palladium', 'rhodium', 'iridium', 'rare'],
  },
  S: {
    common: ['iron', 'silicon'],
    uncommon: ['aluminium', 'nickel'],
    rare: ['platinum'],
    exotic: ['uranium'],
  },
  C: {
    common: ['carbon', 'ice'],
    uncommon: ['hydrogen'],
    rare: ['palladium'],
    exotic: ['iridium', 'rhodium'],
  },
  icy: {
    common: ['ice'],
    uncommon: ['silicon', 'hydrogen'],
    rare: [],
    exotic: ['rare'],
  },
  'gas-giant': {
    common: ['ice', 'silicon'],
    uncommon: ['hydrogen'],
    rare: ['uranium'],
    exotic: ['rare'],
  },
}

// Rarer tiers only "unlock" further from Earth — mirrors real accessibility/
// difficulty scaling rather than literal composition (a rare mineral doesn't
// stop existing at orbit 1, it's just not what an early, close-in claim
// happens to expose).
const RARE_TIER_MIN_ORBIT = 2
const EXOTIC_TIER_MIN_ORBIT = 4

export function mineralsForArchetype(archetype: TargetArchetype, orbit: number): string[] {
  const pool = ARCHETYPE_POOLS[archetype]
  const out = [...pool.common, ...pool.uncommon]
  if (orbit >= RARE_TIER_MIN_ORBIT) out.push(...pool.rare)
  if (orbit >= EXOTIC_TIER_MIN_ORBIT) out.push(...pool.exotic)
  return Array.from(new Set(out))
}
