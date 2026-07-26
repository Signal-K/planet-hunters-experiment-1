// Daily client mission pool — deterministic per calendar day, resets at midnight.

import type { ClientSlot, MineralMeta, Mission } from './types'
import { DEFAULT_MISSION_TEMPLATES, FREE_OPS_START_MISSIONS_DONE, requiredDrillTier } from './mission-generator'
import { CLIENT_AFFINITY_MISSION_THRESHOLD } from './clients'

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

function maxTierForProgress(missionsDone: number): number {
  if (missionsDone >= 12) return 5
  if (missionsDone >= 9) return 4
  if (missionsDone >= 6) return 3
  if (missionsDone >= 5) return 2
  return 1
}

export function generateDailyClientPool(
  date: string,
  missionsDone: number,
  clients: ClientSlot[],
  minerals: Record<string, MineralMeta>,
  clientMissions: Record<string, number> = {},
): Mission[] {
  const maxTier = maxTierForProgress(missionsDone)
  const eligible = clients.filter(c => c.unlockTier <= maxTier)
  const baseTemplates = DEFAULT_MISSION_TEMPLATES.filter(t => !t.id.startsWith('freeops-'))
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

      const preferred = template.mineralKeys.filter(k => client.mineralPreferences.includes(k))
      const fallback = template.mineralKeys.filter(k => !client.mineralPreferences.includes(k))
      const candidates = preferred.length > 0 ? [...preferred, ...fallback] : fallback
      // Defensive: a template with no mineralKeys, or an inverted cargoRange,
      // would otherwise produce a NaN/undefined mineral or amount below —
      // skip this slot rather than push a broken mission into the pool.
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
        sequence: FREE_OPS_START_MISSIONS_DONE + 1,
        requires: {
          minerals: { [mineralKey]: amount },
          cargo_min: amount,
          drill_tier: requiredDrillTier([mineralKey], template.drillTierMin, minerals),
          max_orbit: template.orbitMax,
        },
        payout: {
          francs,
          affinity: Math.max(5, Math.round(8 + amount / 2)),
        },
      })
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
): DailyClientPool {
  const today = todayDateKey()
  if (existing?.date === today) return existing
  return {
    date: today,
    missions: generateDailyClientPool(today, missionsDone, clients, minerals, clientMissions),
    acceptedId: null,
    completedIds: [],
  }
}
