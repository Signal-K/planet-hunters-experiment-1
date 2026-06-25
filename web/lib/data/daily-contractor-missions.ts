// Daily contractor mission pool — deterministic per calendar day, resets at midnight.

import type { ContractorSlot, MineralMeta, Mission } from './types'
import { DEFAULT_MISSION_TEMPLATES, FREE_OPS_START_MISSIONS_DONE } from './mission-generator'

export interface DailyContractorPool {
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
  if (missionsDone >= 9) return 4
  if (missionsDone >= 6) return 3
  if (missionsDone >= 5) return 2
  return 1
}

export function generateDailyContractorPool(
  date: string,
  missionsDone: number,
  contractors: ContractorSlot[],
  minerals: Record<string, MineralMeta>,
): Mission[] {
  const maxTier = maxTierForProgress(missionsDone)
  const eligible = contractors.filter(c => c.unlockTier <= maxTier)
  const baseTemplates = DEFAULT_MISSION_TEMPLATES.filter(t => !t.id.startsWith('freeops-'))
  const missions: Mission[] = []

  for (const contractor of eligible) {
    const roleTemplates = baseTemplates.filter(t => t.contractorRole === contractor.uiRole)
    const templatePool = roleTemplates.length > 0 ? roleTemplates : baseTemplates

    for (let slot = 0; slot < 2; slot++) {
      const tSeed = djb2(`${date}:${contractor.id}:${slot}:t`)
      const mSeed = djb2(`${date}:${contractor.id}:${slot}:m`)
      const aSeed = djb2(`${date}:${contractor.id}:${slot}:a`)

      const template = templatePool[tSeed % templatePool.length]

      const preferred = template.mineralKeys.filter(k => contractor.mineralPreferences.includes(k))
      const fallback = template.mineralKeys.filter(k => !contractor.mineralPreferences.includes(k))
      const candidates = preferred.length > 0 ? [...preferred, ...fallback] : fallback
      const mineralKey = candidates[mSeed % candidates.length]

      const [min, max] = template.cargoRange
      const amount = min + (aSeed % (max - min + 1))
      const meta = minerals[mineralKey]
      const francs = Math.round(
        (meta?.price ?? 0) * amount * 1500 * template.payoutMultiplier * (1 + contractor.payoutPremium)
      )

      missions.push({
        id: `dcp-${date}-${contractor.id}-${slot}`,
        title: `${meta?.name ?? mineralKey} ${template.tag.toLowerCase()} contract`,
        brief: `${contractor.name} needs ${amount} units of ${(meta?.name ?? mineralKey).toLowerCase()} for ${contractor.projectType.toLowerCase()}. Preferred cargo earns a contractor premium.`,
        contractor: contractor.id,
        tag: template.tag,
        difficulty: template.difficulty,
        locked: false,
        sequence: FREE_OPS_START_MISSIONS_DONE + 1,
        requires: {
          minerals: { [mineralKey]: amount },
          cargo_min: amount,
          drill_tier: template.drillTierMin,
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
  existing: DailyContractorPool | undefined,
  missionsDone: number,
  contractors: ContractorSlot[],
  minerals: Record<string, MineralMeta>,
): DailyContractorPool {
  const today = todayDateKey()
  if (existing?.date === today) return existing
  return {
    date: today,
    missions: generateDailyContractorPool(today, missionsDone, contractors, minerals),
    acceptedId: null,
    completedIds: [],
  }
}
