// What a probe's survey opens up (SSL-773, Liam 12 Nov): a free targeted run to the body, mining what the probe
// found, and client contracts for the deposits clients want. Both are offered once the probe has found something
// and stay tied to that body. Pure over the survey, like survey-probe.ts.

import { CLIENT_SLOTS } from '@/lib/data/clients'
import { CARGO_BONUS_RATE } from '@/lib/data/economy'
import { FREE_OPS_MISSION_SEQUENCE, requiredDrillTier } from '@/lib/data/mission-generator'
import { MINERAL_META } from '@/lib/data/minerals'
import { normalizeMissionPayout } from '@/lib/data/payouts'
import type { Mission, Target } from '@/lib/data/types'
import type { SurveyTotal } from './survey-probe'

/** A free run starts with this much hold, like the other free runs; the player can fly it again for the rest. */
const RUN_UNITS_PER_MINERAL = 6
const STARTER_HOLD_UNITS = 6
/** Contracts one body offers at most, the most valuable deposits first. */
const CONTRACTS_PER_BODY = 3
/** A client pays a quarter more for the first claim on a deposit a probe found. */
const FIRST_CLAIM_PREMIUM = 1.25

export const PROBE_RUN_PREFIX = 'self-directed-probe-'
export const PROBE_CONTRACT_PREFIX = 'probe-contract-'

export function probeRunId(targetId: string): string {
  return `${PROBE_RUN_PREFIX}${targetId}`
}

const byValue = (survey: readonly SurveyTotal[]) =>
  [...survey].sort((a, b) => (MINERAL_META[b.mineral]?.price ?? 0) - (MINERAL_META[a.mineral]?.price ?? 0))
const name = (id: string) => MINERAL_META[id]?.name ?? id

/** The free run to a surveyed body: no client and no fee, it mines the most valuable deposits found so far. */
export function probeRunMission(target: Target, survey: readonly SurveyTotal[]): Mission | null {
  const picks = byValue(survey).slice(0, 3).map(row => row.mineral)
  if (!picks.length) return null
  const minerals = Object.fromEntries(picks.map(id => [id, RUN_UNITS_PER_MINERAL]))
  const units = picks.length * RUN_UNITS_PER_MINERAL
  const value = picks.reduce((sum, id) => sum + (MINERAL_META[id]?.price ?? 0) * RUN_UNITS_PER_MINERAL, 0)
  return {
    id: probeRunId(target.id),
    title: `Targeted run to ${target.name}`,
    brief: `Your probe mapped ${picks.map(name).join(', ').toLowerCase()} on ${target.name}. No client and no fee: fly out, mine what it found, and keep or sell the haul.`,
    tag: 'FREE OPS',
    difficulty: target.difficulty,
    locked: false,
    sequence: FREE_OPS_MISSION_SEQUENCE,
    unlockAt: 'Survey a body with a probe',
    targetId: target.id,
    requires: {
      minerals,
      cargo_min: Math.min(units, STARTER_HOLD_UNITS),
      drill_tier: requiredDrillTier(picks, 1, MINERAL_META),
      max_orbit: target.orbit,
    },
    payout: { francs: normalizeMissionPayout(value * CARGO_BONUS_RATE, FREE_OPS_MISSION_SEQUENCE), affinity: 0 },
  }
}

/** The mineral a contract is for, read back from its id. */
export function probeContractMineral(missionId: string, targetId: string): string | null {
  const prefix = `${PROBE_CONTRACT_PREFIX}${targetId}-`
  return missionId.startsWith(prefix) ? missionId.slice(prefix.length) : null
}

/**
 * Client contracts for what the probe found: a client who wants a mineral the survey turned up asks for a load of
 * it from that body. Earth-abundant minerals are left out (nobody pays to haul them home), and contracts already
 * flown are not offered again.
 */
export function probeContracts(target: Target, survey: readonly SurveyTotal[], flown: ReadonlySet<string> = new Set()): Mission[] {
  const contracts: Mission[] = []
  for (const row of byValue(survey)) {
    if (contracts.length >= CONTRACTS_PER_BODY) break
    const meta = MINERAL_META[row.mineral]
    if (!meta || meta.earthAbundant) continue
    const client = CLIENT_SLOTS.find(slot => slot.mineralPreferences.includes(row.mineral))
    const id = `${PROBE_CONTRACT_PREFIX}${target.id}-${row.mineral}`
    if (!client || flown.has(id)) continue
    const amount = Math.max(4, Math.min(10, Math.round(row.tonnes / 60)))
    const francs = meta.price * amount * CARGO_BONUS_RATE * FIRST_CLAIM_PREMIUM * (1 + client.payoutPremium)
    contracts.push({
      id,
      title: `${meta.name} from ${target.name}`,
      brief: `${client.name} heard about your probe survey and wants ${amount} units of ${meta.name.toLowerCase()} from ${target.name} for ${client.projectType.toLowerCase()}. First claim pays a premium.`,
      client: client.id,
      tag: 'MINING',
      difficulty: target.difficulty,
      locked: false,
      sequence: FREE_OPS_MISSION_SEQUENCE,
      targetId: target.id,
      requires: {
        minerals: { [row.mineral]: amount },
        cargo_min: amount,
        drill_tier: requiredDrillTier([row.mineral], 1, MINERAL_META),
        max_orbit: target.orbit,
      },
      payout: {
        francs: normalizeMissionPayout(francs, FREE_OPS_MISSION_SEQUENCE),
        affinity: Math.max(5, Math.round(8 + amount / 2)),
      },
    })
  }
  return contracts
}
