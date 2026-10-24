// Daily client mission pool — deterministic per calendar day, resets at midnight.

import type { ClientSlot, MineralMeta, Mission } from './types'
import { DEFAULT_MISSION_TEMPLATES, FREE_OPS_MISSION_SEQUENCE, requiredDrillTier, deliveryEligibleMineralKeys } from './mission-generator'
import { CLIENT_AFFINITY_MISSION_THRESHOLD } from './clients'
import { normalizeMissionPayout } from './payouts'
import { CARGO_BONUS_RATE } from './economy'
import { TARGETS } from './targets'
import type { Target } from './types'

// Base daily slots per client, before affinity bonus slots.
export const BASE_DAILY_SLOTS_PER_CLIENT = 3

// Affinity "level" = one level per CLIENT_AFFINITY_MISSION_THRESHOLD
// completed missions with that client (reusing the existing threshold
// convention, e.g. clients.ts's advanced-unlock gate). Bonus slots =
// (level - 1), capped at +5, and permanent once reached (a function of
// total completed jobs, which never decreases).
export const MAX_AFFINITY_BONUS_SLOTS = 5

export function clientAffinityLevel(completedJobs: number): number {
  return 1 + Math.floor(Math.max(0, completedJobs) / CLIENT_AFFINITY_MISSION_THRESHOLD)
}

export function affinityBonusSlots(completedJobs: number): number {
  return Math.min(MAX_AFFINITY_BONUS_SLOTS, clientAffinityLevel(completedJobs) - 1)
}

export interface DailyClientPool {
  date: string        // 'YYYY-MM-DD' — pool is valid for this calendar day
  missions: Mission[] // full generated pool (all statuses)
  acceptedId: string | null   // id of the mission currently in-flight
  completedIds: string[]      // ids completed today (reward already received via debrief)
}

export function todayDateKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Unsigned DJB2 hash — deterministic seeding for daily mission variety
function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0
  return h
}

export function maxTierForProgress(missionsDone: number): number {
  if (missionsDone >= 12) return 5
  if (missionsDone >= 9) return 4
  if (missionsDone >= 6) return 3
  if (missionsDone >= 5) return 2
  return 1
}

/** Construction jobs are mined on site, so ask only for materials some target in range holds together. The plan's
 * smallest-quantity materials are dropped first until one does. */
function suppliableMaterials(required: Record<string, number>, maxOrbit: number, targets: Target[]): Record<string, number> {
  const ids = Object.keys(required).sort((a, b) => required[b] - required[a])
  for (let keep = ids.length; keep > 1; keep--) {
    const subset = ids.slice(0, keep)
    if (targets.some(t => t.orbit <= maxOrbit && t.type === 'asteroid' && subset.every(id => t.minerals.includes(id)))) {
      return Object.fromEntries(subset.map(id => [id, required[id]]))
    }
  }
  return { [ids[0]]: required[ids[0]] }
}

export function generateDailyClientPool(
  date: string,
  missionsDone: number,
  clients: ClientSlot[],
  minerals: Record<string, MineralMeta>,
  clientMissions: Record<string, number> = {},
  targets: Target[] = TARGETS,
): Mission[] {
  const maxTier = maxTierForProgress(missionsDone)
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
        (meta?.price ?? 0) * amount * CARGO_BONUS_RATE * template.payoutMultiplier * (1 + client.payoutPremium)
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
  }

  // SSL-571: one optional client build job per construct template and day, offered by a client of the matching role.
  // The mission carries the construction plan, so finishing it places the structure at the target.
  for (const template of DEFAULT_MISSION_TEMPLATES.filter(t => t.tag === 'CONSTRUCT' && t.construction)) {
    const plan = template.construction!
    const candidates = eligible.filter(c => c.uiRole === template.clientRole)
    if (candidates.length === 0) continue
    const client = candidates[djb2(`${date}:${template.id}:c`) % candidates.length]
    const materials = suppliableMaterials(plan.requiredMaterials, template.orbitMax, targets)
    const cargoMin = Object.values(materials).reduce((sum, n) => sum + n, 0)
    const price = Object.entries(materials).reduce((sum, [id, n]) => sum + ((minerals[id]?.price ?? 0) * n), 0)
    const structure = plan.structureKind.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    missions.push({
      id: `dcp-${date}-${client.id}-${template.id}`,
      title: `Build a ${structure}`,
      brief: `${client.name} wants a ${structure.toLowerCase()} raised on site. Haul the materials out and it is built before you head home.`,
      client: client.id,
      tag: template.tag,
      difficulty: template.difficulty,
      locked: false,
      sequence: FREE_OPS_MISSION_SEQUENCE,
      requires: {
        minerals: materials,
        cargo_min: cargoMin,
        drill_tier: requiredDrillTier(Object.keys(materials), template.drillTierMin, minerals),
        max_orbit: template.orbitMax,
      },
      payout: {
        francs: normalizeMissionPayout(Math.round(price * CARGO_BONUS_RATE * template.payoutMultiplier * (1 + client.payoutPremium)), FREE_OPS_MISSION_SEQUENCE),
        affinity: Math.max(8, Math.round(10 + cargoMin / 2)),
      },
      construction: { ...plan, requiredMaterials: materials },
    })
  }

  return missions
}

/** Today's pool for this player. Same day keeps what was accepted or completed and any payout already adjusted, so
 * a mid-day tier or affinity unlock only adds contracts. A new day starts clean. */
export function refreshPoolIfStale(
  existing: DailyClientPool | undefined,
  missionsDone: number,
  clients: ClientSlot[],
  minerals: Record<string, MineralMeta>,
  clientMissions: Record<string, number> = {},
  today: string = todayDateKey(),
): DailyClientPool {
  const generated = generateDailyClientPool(today, missionsDone, clients, minerals, clientMissions)
  if (existing?.date !== today) return { date: today, missions: generated, acceptedId: null, completedIds: [] }
  const kept = new Map(existing.missions.map(mission => [mission.id, mission]))
  const missions = generated.map(mission => kept.get(mission.id) ?? mission)
  const unchanged = missions.length === existing.missions.length && missions.every((mission, i) => mission === existing.missions[i])
  return unchanged ? existing : { ...existing, missions }
}
