// SSL-657 (Liam, 22 Oct): a finished shower unlocks special missions that come later. Which ones depends on when
// the player did it: gold (in the window) opens more than silver (after it). The keys are the event badge, the
// Orionids find voucher and Meteorite Mastery, and they stack like a season pass: each key opens one more run,
// and every Mastery level adds to what all of them pay. Pure over the player, like probe-offers.ts.

import { CARGO_BONUS_RATE } from '@/lib/data/economy'
import { FREE_OPS_MISSION_SEQUENCE, requiredDrillTier } from '@/lib/data/mission-generator'
import { MINERAL_META } from '@/lib/data/minerals'
import { normalizeMissionPayout } from '@/lib/data/payouts'
import { SHOWERS, getShower } from '@/lib/data/showers'
import type { PlayerBadge } from '@/lib/data/sky-events'
import type { Mission, Target } from '@/lib/data/types'
import type { OrionidsFind } from './finds'

export const SPECIAL_PREFIX = 'self-directed-special-'
const UNITS_PER_MINERAL = 6
/** Each Meteorite Mastery level adds this much to every special's payout, up to three levels. */
export const MASTERY_BONUS_PER_LEVEL = 0.1
const MASTERY_CAP = 3

export type SpecialKey = 'badge' | 'gold' | 'mastery' | 'voucher'

interface SpecialDef {
  kind: string
  key: SpecialKey
  targetId: string
  title: (shower: string) => string
  brief: (shower: string, target: string) => string
  minerals: number
  multiplier: number
}

// Real bodies tied to meteorites: Itokawa and Bennu returned samples, Psyche is a metal core like iron meteorites,
// and Vesta is where the HED meteorites come from.
const DEFS: SpecialDef[] = [
  { kind: 'trail', key: 'badge', targetId: 'itokawa', minerals: 2, multiplier: 1.3,
    title: s => `${s} impact survey`,
    brief: (s, t) => `You took part in the ${s}. Fly to ${t}, where stream dust has peppered the surface, and mine the impact sites.` },
  { kind: 'pristine', key: 'gold', targetId: 'psyche', minerals: 2, multiplier: 1.8,
    title: s => `${s} pristine recovery`,
    brief: (s, t) => `Gold for the ${s}: you were out in the window. ${t} is a bare metal core, like the iron meteorites. Recover its rarest metals.` },
  { kind: 'assay', key: 'mastery', targetId: 'bennu', minerals: 3, multiplier: 1.5,
    title: s => `${s} meteorite assay`,
    brief: (s, t) => `Meteorite Mastery opens this one. ${t} is the kind of rubble meteorites break from: assay three of its minerals for the ${s} record.` },
]
const VOUCHER: SpecialDef = { kind: 'voucher', key: 'voucher', targetId: 'vesta', minerals: 2, multiplier: 1.5,
  title: () => 'Orionids voucher: Vesta',
  brief: (_s, t) => `Redeem your Orionids find voucher. ${t} is where the HED meteorites come from: fly out and mine what fell from it.` }

export interface SpecialPlayer {
  badges?: Record<string, PlayerBadge>
  meteoriteMastery?: number
  orionidsFinds?: Record<string, OrionidsFind>
}

export interface SpecialView {
  id: string
  title: string
  key: SpecialKey
  targetId: string
  /** Open to start, locked (with what it needs), or already flown. */
  state: 'open' | 'locked' | 'flown'
  needs: string
}

export const specialId = (eventId: string, kind: string) => `${SPECIAL_PREFIX}${eventId}-${kind}`

function defsFor(eventId: string): SpecialDef[] {
  return eventId === 'orionids-2026' ? [...DEFS, VOUCHER] : DEFS
}

const voucherTier = (player: SpecialPlayer) => {
  const finds = Object.values(player.orionidsFinds ?? {})
  return finds.some(f => f.tier === 'gold') ? 'gold' : finds.length ? 'silver' : null
}

function unlocked(def: SpecialDef, eventId: string, player: SpecialPlayer): boolean {
  const tier = player.badges?.[eventId]?.tier
  if (def.key === 'badge') return !!tier
  if (def.key === 'gold') return tier === 'gold'
  if (def.key === 'mastery') return !!tier && (player.meteoriteMastery ?? 0) >= 1
  return !!voucherTier(player)
}

const NEEDS: Record<SpecialKey, string> = {
  badge: 'Finish the event',
  gold: 'Gold: finish it in the window',
  mastery: 'Meteorite Mastery 1',
  voucher: 'An Orionids find voucher',
}

/** Every special a shower offers and where the player stands on each. */
export function showerSpecials(eventId: string, player: SpecialPlayer, flown: ReadonlySet<string> = new Set()): SpecialView[] {
  const name = getShower(eventId)?.name ?? 'Shower'
  return defsFor(eventId).map(def => {
    const id = specialId(eventId, def.kind)
    const state = flown.has(id) ? 'flown' : unlocked(def, eventId, player) ? 'open' : 'locked'
    return { id, title: def.title(name), key: def.key, targetId: def.targetId, state, needs: NEEDS[def.key] }
  })
}

/** What Mastery adds to every special's payout. */
export const masteryBonus = (player: SpecialPlayer) => Math.min(MASTERY_CAP, player.meteoriteMastery ?? 0) * MASTERY_BONUS_PER_LEVEL

/** The unlocked, not yet flown specials as Free run missions on their bodies. */
export function specialMissions(targets: readonly Target[], player: SpecialPlayer, flown: ReadonlySet<string> = new Set()): Mission[] {
  const bonus = masteryBonus(player)
  return SHOWERS.flatMap(shower => defsFor(shower.id).flatMap(def => {
    const id = specialId(shower.id, def.kind)
    if (flown.has(id) || !unlocked(def, shower.id, player)) return []
    const target = targets.find(t => t.id === def.targetId)
    if (!target) return []
    const picks = [...target.minerals]
      .sort((a, b) => (MINERAL_META[b]?.price ?? 0) - (MINERAL_META[a]?.price ?? 0))
      .slice(0, def.minerals)
    if (!picks.length) return []
    const value = picks.reduce((sum, m) => sum + (MINERAL_META[m]?.price ?? 0) * UNITS_PER_MINERAL, 0)
    const multiplier = def.key === 'voucher' && voucherTier(player) === 'silver' ? 1.2 : def.multiplier
    const mission: Mission = {
      id,
      title: def.title(shower.name),
      brief: def.brief(shower.name, target.name),
      tag: 'FREE OPS',
      difficulty: target.difficulty,
      locked: false,
      sequence: FREE_OPS_MISSION_SEQUENCE,
      unlockAt: NEEDS[def.key],
      targetId: target.id,
      requires: {
        minerals: Object.fromEntries(picks.map(m => [m, UNITS_PER_MINERAL])),
        cargo_min: Math.min(picks.length * UNITS_PER_MINERAL, 12),
        drill_tier: requiredDrillTier(picks, 1, MINERAL_META),
        max_orbit: target.orbit,
      },
      payout: { francs: normalizeMissionPayout(value * CARGO_BONUS_RATE * multiplier * (1 + bonus), FREE_OPS_MISSION_SEQUENCE), affinity: 0 },
    }
    return [mission]
  }))
}
