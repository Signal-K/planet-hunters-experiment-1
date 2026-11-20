import type { CustomizerPart } from './shipCustomizer'

export const PASSPORT_START_WEEK = '2026-10-05'
export const PASSPORT_GOAL = 100
const WEEK_MS = 7 * 86_400_000
// Each issue is a distinct permanent part, using the existing tier-2 mechanics/art.
const TEMPLATES = [
  { slot: 'engine', kind: 'engine', name: 'Research thruster', successBonus: 26, mass: 3, power: 8, img: '/game/assets/rooms/engine_room_t2_icon.png' },
  { slot: 'cargo-hold', kind: 'payload', name: 'Research silo bank', successBonus: 20, mass: 3, power: -1, img: '/game/assets/rooms/cargo_bay_t2_icon.png' },
  { slot: 'mining-laser', kind: 'booster', name: 'Research mining laser', successBonus: 22, mass: 2, power: 6, img: '/game/assets/rooms/mining_room_t2_icon.png' },
  { slot: 'fuel-tank', kind: 'fuel-stage', name: 'Research fuel stage', successBonus: 14, mass: 2, power: 0, img: '/game/assets/rockets/parts/lox-lh2-stage-t1_icon.png' },
  { slot: 'booster', kind: 'booster', name: 'Research booster pair', successBonus: 15, mass: 2, power: 4, img: '/game/assets/rockets/parts/vulcan-booster-t1_icon.png' },
] as const
export function weeklyRocketPart(week: string): CustomizerPart | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || week < PASSPORT_START_WEEK) return undefined
  const at = Date.parse(`${week}T00:00:00Z`)
  if (!Number.isFinite(at) || new Date(at).toISOString().slice(0, 10) !== week || new Date(at).getUTCDay() !== 1) return undefined
  const issue = Math.floor((at - Date.parse(`${PASSPORT_START_WEEK}T00:00:00Z`)) / WEEK_MS)
  const { slot, ...part } = TEMPLATES[issue % TEMPLATES.length]
  return { ...part, id: `research-${slot}-${week}`, name: `${part.name} · ${week}`, tier: 2, price: 0,
    description: `Week of ${week}. Earned by contributing when the community fills this passport goal.` }
}
export function weeklyRocketPartById(id: string): CustomizerPart | undefined {
  const match = /^research-(?:engine|cargo-hold|mining-laser|fuel-tank|booster)-(\d{4}-\d{2}-\d{2})$/.exec(id)
  const part = match ? weeklyRocketPart(match[1]) : undefined
  return part?.id === id ? part : undefined
}
