// Landnam game data — unified crafting / build recipe registry (SSL-316).
//
// Every buildable, placeable, refinable or fabricatable thing in the game is
// listed here once so the Market can show "what does X cost" for all of them
// and so the takeon sandbox, Earth base, subsurface deck and factory all
// charge from the same table. Existing data modules stay the source of truth
// for their own domain (structures.ts, target-structures.ts, subsurface.ts,
// rocket-composition.ts, surface-ops.ts); this module derives from them and
// adds the sandbox-only structures (roads, factories, silos, beacons…) that
// only exist on a takeon field.

import type { StructureBlueprint, TargetStructureBlueprint } from './types'
import { STRUCTURES, REFINERY_RECIPES } from './structures'
import { TARGET_STRUCTURES } from './target-structures'
import { SUBSURFACE_ROOMS } from './subsurface'
import { ROCKET_COMPOSITIONS } from './rocket-composition'
import { ROCKET_MODELS } from './rockets'
import { SETTLEMENT_LAUNCHPAD } from './surface-ops'

export type CraftingCategory =
  | 'sandbox-structure'
  | 'road'
  | 'earth-structure'
  | 'target-structure'
  | 'subsurface-room'
  | 'refined-good'
  | 'rocket-component'
  | 'vehicle'

export type CraftingProducer = 'field' | 'earth-base' | 'subsurface' | 'refinery' | 'factory' | 'hangar' | 'client'

export interface CraftingRecipe {
  id: string
  name: string
  category: CraftingCategory
  description: string
  /** Francs charged when the recipe is executed. 0 means resources-only (or client-funded). */
  costFrancs: number
  /** Raw minerals consumed from the player's stash (Earth) or rover cargo/site storage (field). */
  costMinerals: Readonly<Record<string, number>>
  /** Refined goods consumed (factory recipes only). */
  costRefined?: Readonly<Record<string, number>>
  /** Where the recipe is executed. */
  producedAt: CraftingProducer
  /** takeon StructureType this recipe places on the field, if it is a field structure. */
  takeonType?: string
  /** Whether the result is placed on a tile (vs. produced into inventory). */
  placeable: boolean
  buildTimeMs?: number
  /** Output for inventory-producing recipes. */
  output?: { kind: 'refined' | 'rocket-part'; id: string; amount: number }
  /** Decorative field structures have no function beyond layout/wayfinding. */
  decorative?: boolean
}

/**
 * Field (takeon sandbox) structures. Costs are in francs + raw minerals held in
 * the rover's cargo or the site's storage. Prices sit below Earth-base
 * structures because a field site is a temporary operation, not a facility,
 * and well above the per-unit mineral value so building is a real spend.
 *
 * Nav Beacon / Supply Cache / Solar Array / Drill Rig / Generator / Habitat
 * Frame follow the ZenNotes "Surface ops v0 buildable structures and costs"
 * decision; Field Refinery, Factory, Pylon, Silo, Road and Launch Pad are the
 * SSL-316 sandbox additions.
 */
export const SANDBOX_STRUCTURE_RECIPES: readonly CraftingRecipe[] = [
  {
    id: 'field-road',
    name: 'Road Segment',
    category: 'road',
    description: 'Graded surface track. Roads are decorative wayfinding: they mark rover routes between sites and structures.',
    costFrancs: 40_000,
    costMinerals: { iron: 1 },
    producedAt: 'field',
    takeonType: 'road',
    placeable: true,
    decorative: true,
  },
  {
    id: 'field-beacon',
    name: 'Nav Beacon',
    category: 'sandbox-structure',
    description: 'Marks a claim or a route waypoint. Placing a beacon registers a territory claim for the division it stands in.',
    costFrancs: 0,
    costMinerals: { aluminium: 4, copper: 2 },
    producedAt: 'field',
    takeonType: 'beacon',
    placeable: true,
    decorative: true,
  },
  {
    id: 'field-cache',
    name: 'Supply Cache',
    category: 'sandbox-structure',
    description: 'Sealed surface storage. Deposit cargo here to free the rover hold between ferry windows.',
    costFrancs: 400_000,
    costMinerals: { aluminium: 6, carbon: 3 },
    producedAt: 'field',
    takeonType: 'cache',
    placeable: true,
  },
  {
    id: 'field-solar-array',
    name: 'Solar Array',
    category: 'sandbox-structure',
    description: 'Recharges the rover battery when it parks alongside. Needed for any operation longer than one charge.',
    costFrancs: 1_200_000,
    costMinerals: { silicon: 8, aluminium: 8, copper: 4 },
    producedAt: 'field',
    takeonType: 'solar-array',
    placeable: true,
  },
  {
    id: 'field-drill-rig',
    name: 'Auto-Drill Rig',
    category: 'sandbox-structure',
    description: 'Unattended extraction on the deposit it is built over. Output accrues to the site storage.',
    costFrancs: 2_500_000,
    costMinerals: { iron: 12, aluminium: 8, copper: 4 },
    producedAt: 'field',
    takeonType: 'drill-rig',
    placeable: true,
  },
  {
    id: 'field-generator',
    name: 'Generator',
    category: 'sandbox-structure',
    description: 'Powered base load for refineries and factories. One generator supports one processing structure.',
    costFrancs: 3_000_000,
    costMinerals: { iron: 8, copper: 6, uranium: 2 },
    producedAt: 'field',
    takeonType: 'generator',
    placeable: true,
  },
  {
    id: 'field-pylon',
    name: 'Power Pylon',
    category: 'sandbox-structure',
    description: 'Carries generator power across the site so refineries and factories can sit away from the generator.',
    costFrancs: 150_000,
    costMinerals: { copper: 2, aluminium: 2 },
    producedAt: 'field',
    takeonType: 'pylon',
    placeable: true,
  },
  {
    id: 'field-refinery',
    name: 'Field Refinery',
    category: 'sandbox-structure',
    description: 'Compact ore processor. Converts raw minerals in site storage into refined goods using the Earth refinery recipe table.',
    costFrancs: 4_000_000,
    costMinerals: { iron: 10, copper: 6, silicon: 4 },
    producedAt: 'field',
    takeonType: 'refinery',
    placeable: true,
  },
  {
    id: 'field-factory',
    name: 'Factory',
    category: 'sandbox-structure',
    description: 'Fabricates rocket components from refined goods. Finished parts are logged to Parts Stores on Earth.',
    costFrancs: 6_000_000,
    costMinerals: { iron: 16, aluminium: 8, copper: 6, silicon: 4 },
    producedAt: 'field',
    takeonType: 'factory',
    placeable: true,
  },
  {
    id: 'field-silo',
    name: 'Field Silo',
    category: 'sandbox-structure',
    description: 'Raises site storage capacity so drill rigs and refineries can run longer between ferries.',
    costFrancs: 1_500_000,
    costMinerals: { aluminium: 10, iron: 6 },
    producedAt: 'field',
    takeonType: 'silo',
    placeable: true,
  },
  {
    id: 'field-habitat-frame',
    name: 'Habitat Frame',
    category: 'sandbox-structure',
    description: 'Pressurisable shell. Frame only — a crewed habitat is a later upgrade.',
    costFrancs: 5_000_000,
    costMinerals: { iron: 20, aluminium: 12, carbon: 6 },
    producedAt: 'field',
    takeonType: 'habitat-frame',
    placeable: true,
  },
  {
    id: 'field-launch-pad',
    name: SETTLEMENT_LAUNCHPAD.name,
    category: 'sandbox-structure',
    description: 'Ferry pad. Once built, site storage can be shipped to Earth in bulk.',
    costFrancs: SETTLEMENT_LAUNCHPAD.costFrancs,
    costMinerals: SETTLEMENT_LAUNCHPAD.costMaterials,
    producedAt: 'field',
    takeonType: 'launch-pad',
    placeable: true,
    buildTimeMs: SETTLEMENT_LAUNCHPAD.buildTimeMs,
  },
]

/** Factory recipes — refined goods in, rocket components out. */
export const FACTORY_RECIPES: readonly CraftingRecipe[] = [
  {
    id: 'fab-hull-alloy-ii',
    name: 'Hull Alloy II',
    category: 'rocket-component',
    description: 'Prospector-grade hull plating fabricated on site from refined aluminium and cobalt.',
    costFrancs: 250_000,
    costMinerals: {},
    costRefined: { 'refined-aluminium': 2, 'refined-cobalt': 1 },
    producedAt: 'factory',
    placeable: false,
    buildTimeMs: 15 * 60 * 1000,
    output: { kind: 'rocket-part', id: 'hull-alloy-ii', amount: 1 },
  },
  {
    id: 'fab-fusion-drive-ii',
    name: 'Fusion Drive II',
    category: 'rocket-component',
    description: 'Second-tier drive core. Refined uranium fuel assembly with copper heat exchangers.',
    costFrancs: 600_000,
    costMinerals: {},
    costRefined: { 'refined-uranium': 1, 'refined-copper': 2 },
    producedAt: 'factory',
    placeable: false,
    buildTimeMs: 30 * 60 * 1000,
    output: { kind: 'rocket-part', id: 'fusion-drive-ii', amount: 1 },
  },
  {
    id: 'fab-mining-laser-ii',
    name: 'Mining Laser II',
    category: 'rocket-component',
    description: 'Tier-2 extraction laser. Gold-plated optics and copper bus.',
    costFrancs: 400_000,
    costMinerals: {},
    costRefined: { 'refined-gold': 1, 'refined-copper': 1 },
    producedAt: 'factory',
    placeable: false,
    buildTimeMs: 20 * 60 * 1000,
    output: { kind: 'rocket-part', id: 'mining-laser-ii', amount: 1 },
  },
]

function fromEarthStructure(s: StructureBlueprint): CraftingRecipe {
  return {
    id: `earth-${s.id}`,
    name: s.name,
    category: 'earth-structure',
    description: s.description,
    costFrancs: s.cost,
    costMinerals: s.costMaterials ?? {},
    producedAt: 'earth-base',
    placeable: true,
  }
}

function fromTargetStructure(s: TargetStructureBlueprint): CraftingRecipe {
  return {
    id: `target-${s.id}`,
    name: s.name,
    category: 'target-structure',
    description: s.description,
    // Client construction contracts fund the build; the player supplies materials.
    costFrancs: 0,
    costMinerals: s.requiredMaterials,
    producedAt: s.clientRole === 'self' ? 'field' : 'client',
    placeable: true,
    buildTimeMs: s.buildTimeMs,
  }
}

const SUBSURFACE_RECIPES: readonly CraftingRecipe[] = SUBSURFACE_ROOMS.map(room => ({
  id: `room-${room.id}`,
  name: room.name,
  category: 'subsurface-room',
  description: room.description,
  costFrancs: room.cost,
  costMinerals: room.costMaterials,
  producedAt: 'subsurface',
  placeable: true,
}))

const REFINED_GOOD_RECIPES: readonly CraftingRecipe[] = REFINERY_RECIPES.map(r => ({
  id: `refine-${r.id}`,
  name: r.name,
  category: 'refined-good',
  description: `Refine ${r.input.amount} ${r.input.mineral} into one unit of ${r.name}.`,
  costFrancs: r.cost,
  costMinerals: { [r.input.mineral]: r.input.amount },
  producedAt: 'refinery',
  placeable: false,
  buildTimeMs: r.time * 1000,
  output: { kind: 'refined', id: r.id, amount: 1 },
}))

const ROCKET_COMPONENT_RECIPES: readonly CraftingRecipe[] = Object.values(ROCKET_COMPOSITIONS).flatMap(comp =>
  comp.recipes.map(recipe => ({
    id: `part-${recipe.id}`,
    name: recipe.label,
    category: 'rocket-component' as const,
    description: recipe.purchased
      ? `${recipe.label} is bought prebuilt for the ${comp.rocketId} model.`
      : `${recipe.label} is assembled in the Hangar from stash minerals.`,
    costFrancs: 0,
    costMinerals: recipe.ingredients,
    producedAt: 'hangar' as const,
    placeable: false,
    output: { kind: 'rocket-part' as const, id: recipe.id, amount: 1 },
  })),
)

const VEHICLE_RECIPES: readonly CraftingRecipe[] = ROCKET_MODELS.filter(m => !m.locked).map(m => ({
  id: `rocket-${m.id}`,
  name: m.name,
  category: 'vehicle',
  description: `Tier ${m.tier} rocket model. Cargo ${m.stats.cargo}, drill tier ${m.stats.drillTier}.`,
  costFrancs: m.costFrancs,
  costMinerals: {},
  producedAt: 'hangar',
  placeable: false,
}))

/** Every recipe in the game, in Market display order. */
export const CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  ...SANDBOX_STRUCTURE_RECIPES,
  ...FACTORY_RECIPES,
  ...STRUCTURES.map(fromEarthStructure),
  ...SUBSURFACE_RECIPES,
  ...TARGET_STRUCTURES.map(fromTargetStructure),
  ...REFINED_GOOD_RECIPES,
  ...ROCKET_COMPONENT_RECIPES,
  ...VEHICLE_RECIPES,
]

export const CRAFTING_CATEGORY_LABELS: Record<CraftingCategory, string> = {
  'sandbox-structure': 'Field structures',
  road: 'Roads',
  'earth-structure': 'Earth base',
  'target-structure': 'Client builds',
  'subsurface-room': 'Subsurface rooms',
  'refined-good': 'Refined goods',
  'rocket-component': 'Rocket components',
  vehicle: 'Rockets',
}

export const CRAFTING_CATEGORY_ORDER: readonly CraftingCategory[] = [
  'sandbox-structure',
  'road',
  'refined-good',
  'rocket-component',
  'earth-structure',
  'subsurface-room',
  'target-structure',
  'vehicle',
]

export function craftingRecipeById(id: string): CraftingRecipe | undefined {
  return CRAFTING_RECIPES.find(r => r.id === id)
}

export function craftingRecipeForTakeonType(takeonType: string): CraftingRecipe | undefined {
  return SANDBOX_STRUCTURE_RECIPES.find(r => r.takeonType === takeonType)
}

export interface CraftingAffordability {
  ok: boolean
  francsShort: number
  mineralsShort: Record<string, number>
  refinedShort: Record<string, number>
}

/**
 * Check whether a recipe can be executed against the given wallet, mineral
 * inventory and refined-goods inventory. Returns the shortfall per input so
 * UIs can explain exactly what is missing.
 */
export function craftingAffordability(
  recipe: CraftingRecipe,
  francs: number,
  minerals: Readonly<Record<string, number>>,
  refined: Readonly<Record<string, number>> = {},
): CraftingAffordability {
  const francsShort = Math.max(0, recipe.costFrancs - francs)
  const mineralsShort: Record<string, number> = {}
  for (const [k, need] of Object.entries(recipe.costMinerals)) {
    const short = need - (minerals[k] ?? 0)
    if (short > 0) mineralsShort[k] = short
  }
  const refinedShort: Record<string, number> = {}
  for (const [k, need] of Object.entries(recipe.costRefined ?? {})) {
    const short = need - (refined[k] ?? 0)
    if (short > 0) refinedShort[k] = short
  }
  return {
    ok: francsShort === 0 && Object.keys(mineralsShort).length === 0 && Object.keys(refinedShort).length === 0,
    francsShort,
    mineralsShort,
    refinedShort,
  }
}

/** Subtract a recipe's mineral cost from an inventory, returning a new record. */
export function spendMinerals(
  inventory: Readonly<Record<string, number>>,
  cost: Readonly<Record<string, number>>,
): Record<string, number> {
  const next: Record<string, number> = { ...inventory }
  for (const [k, amount] of Object.entries(cost)) {
    const left = (next[k] ?? 0) - amount
    if (left > 0) next[k] = left
    else delete next[k]
  }
  return next
}

/** Add a set of minerals back (refund on a failed placement). */
export function refundMinerals(
  inventory: Readonly<Record<string, number>>,
  cost: Readonly<Record<string, number>>,
): Record<string, number> {
  const next: Record<string, number> = { ...inventory }
  for (const [k, amount] of Object.entries(cost)) next[k] = (next[k] ?? 0) + amount
  return next
}
