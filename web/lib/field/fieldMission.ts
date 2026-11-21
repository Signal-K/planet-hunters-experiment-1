// KES-543 / SSL-870: a mining template's cut and mine beats play in TakeOn's 3D field.
// Pure helpers that turn a Landnam mission, target and fit-out into field options, and the field's hold back into cargo.
import type { Mission, Target } from '@/lib/data'
import { getMissionTemplate, templateForMission, type MiningMethod } from '@/lib/mission-templates'

export type FieldStyleId = 'regolith' | 'rust' | 'carbon' | 'metal' | 'ice'

/** The field look for a body. Mars and the Moon also pull real HiRISE / Kaguya terrain inside TakeOn. */
export function fieldStyleFor(target: Pick<Target, 'id' | 'type' | 'archetype'>): FieldStyleId {
  if (target.id === 'mars') return 'rust'
  if (target.id === 'moon' || target.id === 'mercury') return 'regolith'
  switch (target.archetype) {
    case 'C': return 'carbon'
    case 'M': return 'metal'
    case 'icy': return 'ice'
    default: return 'regolith'
  }
}

/** Templates whose cut/mine beats the field plays. Shower runs keep the 2D catch scene. */
const FIELD_TEMPLATES = new Set(['contract-mining', 'program-free-mining'])

export function playsInField(mission: Pick<Mission, 'id'> & { tag?: string; template?: string }, isShowerRun: boolean): boolean {
  if (isShowerRun) return false
  const t = templateForMission(mission)
  return !!t && FIELD_TEMPLATES.has(t.id) && !!t.methods?.length
}

/**
 * The method the player picked at fit-out: a lander in the loadout carries the rover down to mine on the ground;
 * without one the ship cuts from orbit (the template's default).
 */
export function miningMethodFor(loadout: { lander?: unknown } | undefined, templateId = 'contract-mining'): MiningMethod {
  const methods = getMissionTemplate(templateId)?.methods ?? ['orbit-laser']
  return loadout?.lander && methods.includes('rover') ? 'rover' : methods[0]
}

/** A stable field seed for a mission at a body, so a resumed run lands on the same ground. */
export function fieldSeed(missionId: string, targetId: string): number {
  let h = 2166136261
  for (const ch of `${missionId}@${targetId}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0) % 100000 + 1
}

/** Ore the field places: what the order asks for first, then the rest of the body's minerals. */
export function fieldResources(order: Record<string, number>, bodyMinerals: readonly string[]): string[] {
  const want = Object.keys(order).filter(k => (order[k] ?? 0) > 0)
  return [...want, ...bodyMinerals.filter(m => !want.includes(m))].slice(0, 5)
}

/** Whole units: what the run started with plus what the laser has cut. */
export function cargoFrom(start: Record<string, number> | undefined, hold: ReadonlyMap<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...(start ?? {}) }
  for (const [k, v] of hold) {
    const n = Math.floor(v + 1e-6)
    if (n > 0) out[k] = (out[k] ?? 0) + n
  }
  return out
}

/** Units still owed per mineral, and whether the order is met. */
export function orderLeft(order: Record<string, number>, cargo: Record<string, number>): { left: Record<string, number>; met: boolean } {
  const left: Record<string, number> = {}
  for (const [k, need] of Object.entries(order)) left[k] = Math.max(0, need - (cargo[k] ?? 0))
  return { left, met: Object.values(left).every(v => v === 0) }
}
