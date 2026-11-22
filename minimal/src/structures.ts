// The incremental base (Liam, 2026-11-22): players do not build or buy upgrades.
// Every structure starts at level 1 and levels up by itself as missions are
// flown; each shows a counter of what its next level needs. Some count every
// mission, some only one kind. A new level hands out new missions, a bigger
// rocket (more hold, more of the system in reach) or better gear.
//
// Levels are derived from the run counts every time, never stored, so they can
// never disagree with what was flown, and a rule change here re-levels saves.
import { ROCKET_MODELS } from '@landnam/lib/data/rockets'
import type { MissionType } from './chapters'

export type StructureId = 'launchpad' | 'exchange' | 'control-station' | 'hangar'

export interface Unlock {
  /** Chapter numbers this level opens. */
  chapters?: number[]
  /** Rocket model id this level can launch. */
  rocket?: string
  /** Laser level this level fits (cuts minerals up to Landnam's laserAccess). */
  laser?: number
  /** One short line for the sheet and the home screen. */
  line: string
}

export interface StructureDef {
  id: StructureId
  name: string
  /** Mission types whose runs count; undefined means every mission. */
  counts?: readonly MissionType[]
  /** What a counted run is called on the counter: "2/3 trade runs". */
  unit: [one: string, many: string]
  /** Runs needed to reach each level from the one below: [to L2, to L3]. */
  steps: readonly number[]
  /** What each level gives, index 0 is level 1 (the start). */
  unlocks: readonly Unlock[]
  /** Sprite per level, Landnam's v7 base art. */
  art: readonly string[]
}

const art = (name: string) => [1, 2, 3].map(l => `/game/assets/base/v7/structures/${name}${l === 1 ? '' : `-l${l}`}.png`)

export const STRUCTURES: readonly StructureDef[] = [
  {
    id: 'launchpad',
    name: 'Launchpad',
    unit: ['mission', 'missions'],
    steps: [3, 5],
    unlocks: [
      { rocket: 'explorer', line: 'Explorer rocket' },
      { rocket: 'prospector', line: 'Prospector rocket: bigger hold, reaches farther' },
      { rocket: 'surveyor', line: 'Surveyor rocket: biggest hold, reaches the outer system' },
    ],
    art: art('launchpad'),
  },
  {
    id: 'exchange',
    name: 'Exchange',
    counts: ['client-contract', 'self-directed', 'delivery', 'shower-run', 'materials-haul'],
    unit: ['mining run', 'mining runs'],
    steps: [2, 3],
    unlocks: [
      { chapters: [1, 2], line: 'Client contracts and market sales' },
      { chapters: [3, 7], line: 'Deliveries and material hauls' },
      { chapters: [6], line: 'Meteor shower runs' },
    ],
    art: art('exchange'),
  },
  {
    id: 'control-station',
    name: 'Control Station',
    counts: ['satellite', 'survey-probe', 'survey-flight'],
    unit: ['orbit launch', 'orbit launches'],
    steps: [1, 2],
    unlocks: [
      { chapters: [4], line: 'Space telescope launch' },
      { chapters: [5], line: 'Survey probes' },
      { chapters: [9], line: 'Probe follow-ups to new worlds' },
    ],
    art: art('control-station'),
  },
  {
    id: 'hangar',
    name: 'Hangar',
    counts: ['materials-haul', 'construction'],
    unit: ['haul or build', 'hauls or builds'],
    steps: [1, 2],
    unlocks: [
      { laser: 1, line: 'Mining laser' },
      { chapters: [8], line: 'Construction jobs' },
      { laser: 2, line: 'Laser T2: cuts tougher ore' },
    ],
    art: art('hangar'),
  },
]

/** Finished runs per mission type. */
export type RunCounts = Partial<Record<MissionType, number>>

export interface StructureState {
  def: StructureDef
  level: number
  max: boolean
  /** Counted runs toward the next level, and how many it needs. */
  have: number
  need: number
  /** What the next level gives, if there is one. */
  next?: Unlock
}

export function counted(def: StructureDef, runs: RunCounts): number {
  return Object.entries(runs).reduce((sum, [type, n]) => (!def.counts || def.counts.includes(type as MissionType) ? sum + (n ?? 0) : sum), 0)
}

export function structureState(def: StructureDef, runs: RunCounts): StructureState {
  let left = counted(def, runs)
  let level = 1
  for (const step of def.steps) {
    if (left < step) break
    left -= step
    level++
  }
  const max = level > def.steps.length
  return { def, level, max, have: max ? 0 : left, need: max ? 0 : def.steps[level - 1], next: max ? undefined : def.unlocks[level] }
}

export function baseState(runs: RunCounts): StructureState[] {
  return STRUCTURES.map(def => structureState(def, runs))
}

/** Everything the base gives at its current levels. */
export interface Base {
  structures: StructureState[]
  chapters: Set<number>
  rocket: { id: string; name: string; hold: number; maxOrbit: number }
  laser: number
}

export function base(runs: RunCounts): Base {
  const structures = baseState(runs)
  const chapters = new Set<number>()
  let rocketId = 'explorer'
  let laser = 1
  for (const s of structures) {
    for (const u of s.def.unlocks.slice(0, s.level)) {
      u.chapters?.forEach(c => chapters.add(c))
      if (u.rocket) rocketId = u.rocket
      if (u.laser) laser = Math.max(laser, u.laser)
    }
  }
  const model = ROCKET_MODELS.find(m => m.id === rocketId) ?? ROCKET_MODELS[0]
  return { structures, chapters, laser, rocket: { id: model.id, name: model.name, hold: model.stats.cargo, maxOrbit: model.stats.maxOrbit } }
}

/** The rocket that first reaches an orbit, for "Needs the Prospector" copy. */
export function rocketReaching(orbit: number): string | undefined {
  return ROCKET_MODELS.find(m => !m.locked && m.stats.maxOrbit >= orbit)?.name
}

/** Structures that went up a level between two run counts: the home screen's news. */
export function levelUps(before: RunCounts, after: RunCounts): { def: StructureDef; level: number; unlock: Unlock }[] {
  const was = baseState(before)
  return baseState(after).flatMap((s, i) =>
    s.level > was[i].level ? [{ def: s.def, level: s.level, unlock: s.def.unlocks[s.level - 1] }] : [])
}

export function counterText(s: StructureState): string {
  if (s.max) return 'Top level'
  return `${s.have}/${s.need} ${s.need === 1 ? s.def.unit[0] : s.def.unit[1]}`
}
