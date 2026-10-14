// Daily client mission pool — deterministic per calendar day, resets at midnight.

import type { ClientSlot, MineralMeta, Mission, MissionTemplate } from './types'
import { findTargetStructure } from './target-structures'
import { DEFAULT_MISSION_TEMPLATES, FREE_OPS_MISSION_SEQUENCE, requiredDrillTier, deliveryEligibleMineralKeys } from './mission-generator'
import { CLIENT_AFFINITY_MISSION_THRESHOLD } from './clients'
import { normalizeMissionPayout } from './payouts'

// Base daily slots per client, before affinity bonus slots.
export const BASE_DAILY_SLOTS_PER_CLIENT = 3

// Affinity "level" = one level per CLIENT_AFFINITY_MISSION_THRESHOLD
// completed missions with that client (reusing the existing threshold
// convention, e.g. clients.ts's advanced-unlock gate). Bonus slots =
// (level - 1), capped at +5, and permanent once reached (a function of
// total completed jobs, which never decreases).
export const MAX_AFFINITY_BONUS_SLOTS = 5

export function affinityBonusSlots(completedJobs: number): number {
  const level = 1 + Math.floor(completedJobs / CLIENT_AFFINITY_MISSION_THRESHOLD)
  return Math.min(MAX_AFFINITY_BONUS_SLOTS, level - 1)
}

export interface DailyClientPool {
  date: string        // 'YYYY-MM-DD' — pool is valid for this calendar day
  missions: Mission[] // full generated pool (all statuses)
  acceptedId: string | null   // id of the mission currently in-flight
  completedIds: string[]      // ids completed today (reward already received via debrief)
}

export function todayDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Unsigned DJB2 hash — deterministic seeding for daily mission variety
function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0
  return h
}

function maxTierForProgress(missionsDone: number): number {
  if (missionsDone >= 12) return 5
  if (missionsDone >= 9) return 4
  if (missionsDone >= 6) return 3
  if (missionsDone >= 5) return 2
  return 1
}

// SSL-570: client affinity opens new client tiers. Every
// CLIENT_TIER_AFFINITY_JOBS completed client jobs (across all clients) opens
// the next unlockTier, so all twelve clients become reachable over time even
// for a player who mostly runs contracts rather than raising missionsDone.
export const CLIENT_TIER_AFFINITY_JOBS = 3
export const MAX_CLIENT_TIER = 5

export function maxClientTier(missionsDone: number, clientMissions: Record<string, number> = {}): number {
  const jobs = Object.values(clientMissions).reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0)
  const affinityTier = 1 + Math.floor(jobs / CLIENT_TIER_AFFINITY_JOBS)
  return Math.min(MAX_CLIENT_TIER, Math.max(maxTierForProgress(missionsDone), affinityTier))
}

function constructMission(date: string, client: ClientSlot, template: MissionTemplate, minerals: Record<string, MineralMeta>): Mission | null {
  const plan = template.construction
  if (!plan) return null
  const blueprint = findTargetStructure(plan.structureKind)
  const name = blueprint?.name ?? plan.structureKind
  const materials = { ...plan.requiredMaterials }
  const cargo = Object.values(materials).reduce((sum, n) => sum + n, 0)
  const value = Object.entries(materials).reduce((sum, [key, n]) => sum + (minerals[key]?.price ?? 0) * n, 0)
  const francs = Math.round(value * 1500 * template.payoutMultiplier * (1 + client.payoutPremium))
  return {
    id: `dcp-${date}-${client.id}-build-${plan.structureKind}`,
    title: `Build ${name}`,
    brief: `${client.name} wants a ${name.toLowerCase()} raised at a target of your choice. Mine the materials, fly them out and build on site. Optional client job.`,
    client: client.id,
    tag: template.tag,
    difficulty: template.difficulty,
    locked: false,
    sequence: FREE_OPS_MISSION_SEQUENCE,
    requires: {
      minerals: materials,
      cargo_min: cargo,
      drill_tier: requiredDrillTier(Object.keys(materials), template.drillTierMin, minerals),
      max_orbit: template.orbitMax,
    },
    payout: {
      francs: normalizeMissionPayout(francs, FREE_OPS_MISSION_SEQUENCE),
      affinity: Math.max(8, Math.round(10 + cargo / 2)),
    },
    construction: plan,
  }
}

export function generateDailyClientPool(
  date: string,
  missionsDone: number,
  clients: ClientSlot[],
  minerals: Record<string, MineralMeta>,
  clientMissions: Record<string, number> = {},
): Mission[] {
  const maxTier = maxClientTier(missionsDone, clientMissions)
  const eligible = clients.filter(c => c.unlockTier <= maxTier)
  // CONSTRUCT-tagged templates (fuel-depot/battery-station/fabrication-pad)
  // build structures on-site — cargo never routes back to Earth, so their
  // mineralKeys are deliberately Earth-abundant (see deliveryEligibleMineralKeys
  // in mission-generator.ts). The daily client pool only ever produces ordinary
  // "mine it, fly it home, sell it" contracts, so mixing a CONSTRUCT template
  // in here (as `command-reserve`/`volatile-bulk`'s clientRole siblings did)
  // let a 'bulk'-role client roll e.g. construct-fabrication-pad, whose
  // candidates (iron/silicon/aluminium/carbon) are ALL Earth-abundant — asking
  // the player to haul Earth-abundant ore back to Earth for a fee, which is
  // exactly the situation deliveryEligibleMineralKeys exists to prevent
  // elsewhere. Iron being first/most recognizable in that fallback list is
  // why "always an iron contract" kept showing up for early Free Ops clients
  // (e.g. ferrum-orbital-construction, unlockTier 1, uiRole 'bulk').
  const baseTemplates = DEFAULT_MISSION_TEMPLATES.filter(t => !t.id.startsWith('freeops-') && t.tag !== 'CONSTRUCT')
  // SSL-571: CONSTRUCT templates are emitted as separate build jobs (above),
  // never as delivery slots, so the Earth-abundant concern does not apply.
  const constructTemplates = DEFAULT_MISSION_TEMPLATES.filter(t => t.tag === 'CONSTRUCT' && t.construction)
  const missions: Mission[] = []

  for (const client of eligible) {
    const roleTemplates = baseTemplates.filter(t => t.clientRole === client.uiRole)
    const templatePool = roleTemplates.length > 0 ? roleTemplates : baseTemplates
    const slotCount = BASE_DAILY_SLOTS_PER_CLIENT + affinityBonusSlots(clientMissions[client.id] ?? 0)

    for (let slot = 0; slot < slotCount; slot++) {
      const tSeed = djb2(`${date}:${client.id}:${slot}:t`)
      const mSeed = djb2(`${date}:${client.id}:${slot}:m`)
      const aSeed = djb2(`${date}:${client.id}:${slot}:a`)

      const template = templatePool[tSeed % templatePool.length]

      // Same Earth-abundant exclusion the offline/free-ops generators apply
      // (deliveryEligibleMineralKeys) — belt-and-suspenders in case a future
      // non-CONSTRUCT template ever mixes in an Earth-abundant mineral.
      const eligibleMineralKeys = deliveryEligibleMineralKeys(template, minerals)
      const preferred = eligibleMineralKeys.filter(k => client.mineralPreferences.includes(k))
      const fallback = eligibleMineralKeys.filter(k => !client.mineralPreferences.includes(k))
      const candidates = preferred.length > 0 ? [...preferred, ...fallback] : fallback
      // Defensive: a template with no eligible mineralKeys, or an inverted
      // cargoRange, would otherwise produce a NaN/undefined mineral or amount
      // below — skip this slot rather than push a broken mission into the pool.
      if (candidates.length === 0 || template.cargoRange[1] < template.cargoRange[0]) continue
      const mineralKey = candidates[mSeed % candidates.length]

      const [min, max] = template.cargoRange
      const amount = min + (aSeed % (max - min + 1))
      const meta = minerals[mineralKey]
      const francs = Math.round(
        (meta?.price ?? 0) * amount * 1500 * template.payoutMultiplier * (1 + client.payoutPremium)
      )

      missions.push({
        id: `dcp-${date}-${client.id}-${slot}`,
        title: `${meta?.name ?? mineralKey} ${template.tag.toLowerCase()} contract`,
        brief: `${client.name} needs ${amount} units of ${(meta?.name ?? mineralKey).toLowerCase()} for ${client.projectType.toLowerCase()}. Preferred cargo earns a client premium.`,
        client: client.id,
        tag: template.tag,
        difficulty: template.difficulty,
        locked: false,
        sequence: FREE_OPS_MISSION_SEQUENCE,
        requires: {
          minerals: { [mineralKey]: amount },
          cargo_min: amount,
          drill_tier: requiredDrillTier([mineralKey], template.drillTierMin, minerals),
          max_orbit: template.orbitMax,
        },
        payout: {
          francs: normalizeMissionPayout(francs, FREE_OPS_MISSION_SEQUENCE),
          affinity: Math.max(5, Math.round(8 + amount / 2)),
        },
      })
    }

    // SSL-571: about half the days each client whose role matches a
    // CONSTRUCT template also posts an optional build job.
    const buildTemplate = constructTemplates.find(t => t.clientRole === client.uiRole)
    if (buildTemplate && djb2(`${date}:${client.id}:build`) % 2 === 0) {
      const build = constructMission(date, client, buildTemplate, minerals)
      if (build) missions.push(build)
    }
  }

  return missions
}

export function refreshPoolIfStale(
  existing: DailyClientPool | undefined,
  missionsDone: number,
  clients: ClientSlot[],
  minerals: Record<string, MineralMeta>,
  clientMissions: Record<string, number> = {},
  now: Date = new Date(),
): DailyClientPool {
  const today = todayDateKey(now)
  if (existing?.date === today) return existing
  return {
    date: today,
    missions: generateDailyClientPool(today, missionsDone, clients, minerals, clientMissions),
    acceptedId: null,
    completedIds: [],
  }
}

/** Board offers for today's pool: everything not already completed today. */
export function openDailyClientOffers(pool: DailyClientPool): Mission[] {
  const done = new Set(pool.completedIds)
  return pool.missions.filter(m => !done.has(m.id))
}
