// Host-side sandbox economics for takeon fields (SSL-316, SSL-317).
//
// takeon owns *placement* (the rover, the tile, the saved structure list).
// Landnam owns *what it costs and what it means*: francs and minerals are
// charged from the player's wallet, site storage and stash; a Nav Beacon
// stakes a territory division; a Refinery on a surface site turns buffered
// ore into refined goods; a Factory fabricates rocket components; and a
// biosphere can be seeded on a habitable world once the late-game gates
// are met. Every function here is pure over GameState.

import {
  craftingAffordability,
  craftingRecipeForTakeonType,
  craftingRecipeById,
  divisionForFieldTile,
  FACTORY_RECIPES,
  habitabilityForTarget,
  canSeedBiosphere,
  REFINERY_RECIPES,
  SKILL_NODES,
  spendMinerals,
  surfaceSiteById,
  type CraftingRecipe,
  type SurfaceTarget,
  type TerritoryClaim,
} from '@/lib/data'
import type { FieldStructureRecord, GameState, Player } from '@/lib/game-types'
import { releaseClaimForBeacon, stakeDivision, type OwnershipPlayer } from './OwnershipSystem'
import { surfaceSiteProgress } from './SurfaceOpsSystem'

/** One refinery pass per this interval per field. */
export const FIELD_REFINE_INTERVAL_MS = 60_000
/** Units of ore one field refinery pass converts. */
export const FIELD_REFINE_BATCH = 1

export interface FieldIdentity {
  /** Landnam target the field sits on (planet, moon, asteroid or discovered exoplanet). */
  targetId: string
  /** Client-territory surface site, when the field is one. Minerals are drawn from its storage first. */
  siteId?: string
}

export interface FieldBuildInput {
  id: string
  type: string
  x: number
  y: number
  facing: number
}

export interface FieldBuildResult {
  state: GameState
  ok: boolean
  reason?: string
  recipe?: CraftingRecipe
  claim?: TerritoryClaim
}

export function fieldStructuresFor(player: Pick<Player, 'fieldStructures'>, targetId: string): FieldStructureRecord[] {
  return player.fieldStructures?.[targetId] ?? []
}

export function fieldHasStructure(player: Pick<Player, 'fieldStructures'>, targetId: string, type: string): boolean {
  return fieldStructuresFor(player, targetId).some(s => s.type === type)
}

/** Minerals a field build can draw on: site storage (if any) merged with the Earth stash. */
export function fieldMineralPool(player: Player, siteId?: string): Record<string, number> {
  const stash = player.stash ?? {}
  if (!siteId) return { ...stash }
  const storage = surfaceSiteProgress(player, siteId).storage
  const pool: Record<string, number> = { ...stash }
  for (const [k, v] of Object.entries(storage)) pool[k] = (pool[k] ?? 0) + v
  return pool
}

export function fieldBuildAffordability(player: Player, recipe: CraftingRecipe, siteId?: string) {
  return craftingAffordability(recipe, player.francs, fieldMineralPool(player, siteId), player.refinedGoods ?? {})
}

/** Draw minerals from site storage first, then the stash. Returns the updated player. */
function drawMinerals(player: Player, cost: Readonly<Record<string, number>>, siteId?: string): Player {
  let stash = { ...(player.stash ?? {}) }
  let next = player
  if (siteId) {
    const site = surfaceSiteProgress(player, siteId)
    const storage = { ...site.storage }
    const remainder: Record<string, number> = {}
    for (const [k, amount] of Object.entries(cost)) {
      const fromStorage = Math.min(storage[k] ?? 0, amount)
      if (fromStorage > 0) {
        storage[k] = (storage[k] ?? 0) - fromStorage
        if (storage[k] <= 0) delete storage[k]
      }
      if (amount - fromStorage > 0) remainder[k] = amount - fromStorage
    }
    stash = spendMinerals(stash, remainder)
    const surfaceOps = player.surfaceOps ?? { sites: {} }
    next = {
      ...player,
      surfaceOps: { sites: { ...surfaceOps.sites, [siteId]: { ...site, storage } } },
    }
  } else {
    stash = spendMinerals(stash, cost)
  }
  return { ...next, stash }
}

export function ownershipIdentity(player: Player, authUserId: string | null, name?: string): OwnershipPlayer {
  return {
    id: authUserId ?? 'local-player',
    name: name ?? 'You',
    discoveredExoplanetTargets: player.discoveredExoplanetTargets,
    territoryClaims: player.territoryClaims,
    biosphereSeeds: player.biosphereSeeds,
  }
}

/**
 * Charge the player for a structure takeon just placed and record it. Called
 * from the `built` event, so placement has already succeeded; if the player
 * cannot pay, the caller demolishes the structure again.
 */
export function applyFieldBuild(
  state: GameState,
  field: FieldIdentity,
  structure: FieldBuildInput,
  identity: Pick<OwnershipPlayer, 'id' | 'name'>,
  now: number = Date.now(),
): FieldBuildResult {
  const recipe = craftingRecipeForTakeonType(structure.type)
  if (!recipe) return { state, ok: false, reason: `No recipe for ${structure.type}.` }
  const existing = fieldStructuresFor(state.player, field.targetId)
  if (existing.some(s => s.id === structure.id)) return { state, ok: true, recipe }
  const affordability = fieldBuildAffordability(state.player, recipe, field.siteId)
  if (!affordability.ok) {
    const missing = Object.entries(affordability.mineralsShort).map(([k, v]) => `${v} ${k}`)
    if (affordability.francsShort > 0) missing.unshift(`${affordability.francsShort} francs`)
    return { state, ok: false, reason: `Short ${missing.join(', ')} for ${recipe.name}.`, recipe }
  }
  let player = drawMinerals(state.player, recipe.costMinerals, field.siteId)
  player = { ...player, francs: player.francs - recipe.costFrancs }
  const record: FieldStructureRecord = {
    id: structure.id,
    type: structure.type,
    recipeId: recipe.id,
    x: structure.x,
    y: structure.y,
    facing: structure.facing,
    builtAt: now,
    ...(field.siteId ? { siteId: field.siteId } : {}),
  }
  player = {
    ...player,
    fieldStructures: { ...(player.fieldStructures ?? {}), [field.targetId]: [...existing, record] },
  }
  let claim: TerritoryClaim | undefined
  if (structure.type === 'beacon') {
    const divisionId = divisionForFieldTile(field.targetId, structure.x, structure.y)
    const result = stakeDivision(
      { ...identity, territoryClaims: player.territoryClaims, discoveredExoplanetTargets: player.discoveredExoplanetTargets },
      field.targetId,
      divisionId,
      { beaconStructureId: structure.id, now },
    )
    if (result.ok) {
      claim = result.claim
      player = { ...player, territoryClaims: result.claims }
    }
  }
  return { state: { ...state, player }, ok: true, recipe, claim }
}

/** Forget a demolished structure and drop any claim its beacon staked. No refund: demolition is permanent. */
export function applyFieldDemolish(state: GameState, targetId: string, structureId: string): GameState {
  const existing = fieldStructuresFor(state.player, targetId)
  if (!existing.some(s => s.id === structureId)) return state
  const player: Player = {
    ...state.player,
    fieldStructures: {
      ...(state.player.fieldStructures ?? {}),
      [targetId]: existing.filter(s => s.id !== structureId),
    },
    territoryClaims: releaseClaimForBeacon(state.player.territoryClaims, structureId),
  }
  return { ...state, player }
}

/**
 * Run one refinery pass on a surface site: with a field Refinery built, one
 * batch of buffered ore per recipe becomes refined goods. Rate-limited per
 * field so the UI can call it on every tick.
 */
export function applyFieldRefining(state: GameState, field: FieldIdentity, now: number = Date.now()): GameState {
  if (!field.siteId || !fieldHasStructure(state.player, field.targetId, 'refinery')) return state
  const last = state.player.fieldProcessedAt?.[field.targetId] ?? 0
  if (now - last < FIELD_REFINE_INTERVAL_MS) return state
  const site = surfaceSiteProgress(state.player, field.siteId)
  const storage = { ...site.storage }
  const refinedGoods = { ...(state.player.refinedGoods ?? {}) }
  let changed = false
  for (const recipe of REFINERY_RECIPES) {
    const need = recipe.input.amount * FIELD_REFINE_BATCH
    if ((storage[recipe.input.mineral] ?? 0) < need) continue
    storage[recipe.input.mineral] -= need
    if (storage[recipe.input.mineral] <= 0) delete storage[recipe.input.mineral]
    refinedGoods[recipe.id] = (refinedGoods[recipe.id] ?? 0) + FIELD_REFINE_BATCH
    changed = true
  }
  const surfaceOps = state.player.surfaceOps ?? { sites: {} }
  return {
    ...state,
    player: {
      ...state.player,
      fieldProcessedAt: { ...(state.player.fieldProcessedAt ?? {}), [field.targetId]: now },
      ...(changed
        ? {
            refinedGoods,
            surfaceOps: { sites: { ...surfaceOps.sites, [field.siteId]: { ...site, storage } } },
          }
        : {}),
    },
  }
}

export interface FabricateResult {
  state: GameState
  ok: boolean
  reason?: string
}

/** Fabricate one factory recipe on a field that has a Factory built. */
export function applyFieldFabricate(state: GameState, targetId: string, recipeId: string): FabricateResult {
  const recipe = craftingRecipeById(recipeId)
  if (!recipe || recipe.producedAt !== 'factory' || !recipe.output) return { state, ok: false, reason: 'Unknown factory recipe.' }
  if (!fieldHasStructure(state.player, targetId, 'factory')) return { state, ok: false, reason: 'Build a Factory on this field first.' }
  const refined = state.player.refinedGoods ?? {}
  const affordability = craftingAffordability(recipe, state.player.francs, state.player.stash ?? {}, refined)
  if (!affordability.ok) {
    const missing = Object.entries(affordability.refinedShort).map(([k, v]) => `${v} ${k}`)
    if (affordability.francsShort > 0) missing.unshift(`${affordability.francsShort} francs`)
    return { state, ok: false, reason: `Short ${missing.join(', ')}.` }
  }
  const nextRefined = spendMinerals(refined, recipe.costRefined ?? {})
  const parts = { ...(state.player.fabricatedRocketParts ?? {}) }
  parts[recipe.output.id] = (parts[recipe.output.id] ?? 0) + recipe.output.amount
  return {
    ok: true,
    state: {
      ...state,
      player: {
        ...state.player,
        francs: state.player.francs - recipe.costFrancs,
        stash: spendMinerals(state.player.stash ?? {}, recipe.costMinerals),
        refinedGoods: nextRefined,
        fabricatedRocketParts: parts,
      },
    },
  }
}

export function factoryRecipes(): readonly CraftingRecipe[] {
  return FACTORY_RECIPES
}

export function techTreeComplete(player: Pick<Player, 'unlockedSkillNodes'>): boolean {
  const unlocked = new Set(player.unlockedSkillNodes ?? [])
  return SKILL_NODES.every(node => unlocked.has(node.id))
}

export function lifeGateFor(player: Pick<Player, 'unlockedSkillNodes' | 'setiProgrammeCompletedAt'>) {
  return { techTreeComplete: techTreeComplete(player), setiComplete: !!player.setiProgrammeCompletedAt }
}

export interface SeedResult {
  state: GameState
  ok: boolean
  reason?: string
}

/** Seed a biosphere on a habitable world. Latest-tier only: full tech tree + SETI programme. */
export function applySeedBiosphere(state: GameState, target: SurfaceTarget, now: number = Date.now()): SeedResult {
  if (state.player.biosphereSeeds?.[target.id]) return { state, ok: true }
  const { habitability } = habitabilityForTarget(target)
  const gate = lifeGateFor(state.player)
  if (!canSeedBiosphere(gate, habitability)) {
    const reason = !gate.techTreeComplete
      ? 'Complete the full skill tree first.'
      : !gate.setiComplete
        ? 'Complete the SETI programme first.'
        : 'This world cannot support a biosphere.'
    return { state, ok: false, reason }
  }
  return {
    ok: true,
    state: {
      ...state,
      player: {
        ...state.player,
        biosphereSeeds: { ...(state.player.biosphereSeeds ?? {}), [target.id]: { targetId: target.id, seededAt: now } },
      },
    },
  }
}

/** Landnam target id a surface site's field belongs to. */
export function targetIdForSite(siteId: string): string {
  return surfaceSiteById(siteId)?.bodyId ?? siteId
}
