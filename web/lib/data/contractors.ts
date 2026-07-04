// Landnam game data — contractors and contractor economy

import type { Contractor, ContractorSlot } from './types'

export const CONTRACTOR_COOLDOWN_MS = 30 * 60 * 1000
export const CONTRACTOR_STREAK_LIMIT = 2
export const MAX_AFFINITY_BONUS = 0.15
export const CONTRACTOR_AFFINITY_MISSION_THRESHOLD = 5

export const CONTRACTOR_SLOTS: ContractorSlot[] = [
  {
    id: 'helios-propulsion-depot',
    name: 'Helios Propulsion Depot',
    color: '#f5a623',
    initial: 'HP',
    unlockTier: 1,
    projectType: 'Catalytic thruster components and drive system supply',
    mineralPreferences: ['platinum', 'palladium'],
    payoutPremium: 0.20,
    affinityBonusPerMission: 0.025,
    payoutNotes: '20% premium on platinum-group thruster feedstock',
    affinityNotes: '+2.5% payout per completed Helios job, capped at +15%',
    uiRole: 'starter',
  },
  {
    id: 'arcturus-battery-systems',
    name: 'Arcturus Battery Systems',
    color: '#4f9cf7',
    initial: 'AB',
    unlockTier: 1,
    projectType: 'Hydrogen fuel-cell manufacturing and catalyst supply',
    mineralPreferences: ['palladium', 'iridium'],
    payoutPremium: 0.22,
    affinityBonusPerMission: 0.025,
    payoutNotes: '22% premium on palladium and iridium fuel-cell inputs',
    affinityNotes: '+2.5% payout per completed Arcturus job, capped at +15%',
    uiRole: 'prospect',
  },
  {
    id: 'ferrum-orbital-construction',
    name: 'Ferrum Orbital Construction',
    color: '#c7d0dc',
    initial: 'FO',
    unlockTier: 1,
    projectType: 'High-temperature alloy supply for orbital structure assemblies',
    mineralPreferences: ['platinum', 'iridium'],
    payoutPremium: 0.18,
    affinityBonusPerMission: 0.02,
    payoutNotes: '18% premium on platinum-group structural feedstock',
    affinityNotes: '+2% payout per completed Ferrum job, capped at +15%',
    uiRole: 'bulk',
  },
  {
    id: 'atlas-aggregate',
    name: 'Atlas Aggregate',
    color: '#a8d8ea',
    initial: 'AA',
    unlockTier: 2,
    projectType: 'Bulk construction feedstock and orbital ballast',
    mineralPreferences: ['iron', 'carbon'],
    payoutPremium: 0.18,
    affinityBonusPerMission: 0.02,
    payoutNotes: '18% premium on high-volume construction cargo',
    affinityNotes: '+2% payout per completed Atlas job, capped at +15%',
    uiRole: 'bulk',
  },
  {
    id: 'helioforge-metals',
    name: 'Helioforge Metals',
    color: '#ffd166',
    initial: 'HF',
    unlockTier: 2,
    projectType: 'Nickel, cobalt, and precious-metal assay',
    mineralPreferences: ['nickel', 'cobalt', 'gold'],
    payoutPremium: 0.24,
    affinityBonusPerMission: 0.03,
    payoutNotes: '24% premium on metal assay orders',
    affinityNotes: '+3% payout per completed Helioforge job, capped at +15%',
    uiRole: 'prospect',
  },
  {
    id: 'kepler-materials',
    name: 'Kepler Materials',
    color: '#70e070',
    initial: 'KM',
    unlockTier: 3,
    projectType: 'Deep-core sampling and battery material reserves',
    mineralPreferences: ['nickel', 'cobalt'],
    payoutPremium: 0.22,
    affinityBonusPerMission: 0.03,
    payoutNotes: '22% premium on deep-core metals',
    affinityNotes: '+3% payout per completed Kepler job, capped at +15%',
    uiRole: 'prospect',
  },
  {
    id: 'nightjar-systems',
    name: 'Nightjar Systems',
    color: '#c084ff',
    initial: 'NS',
    unlockTier: 3,
    projectType: 'Rare gas capture and ion drive reserves',
    mineralPreferences: ['rare', 'gold'],
    payoutPremium: 0.28,
    affinityBonusPerMission: 0.035,
    payoutNotes: '28% premium on rare strategic cargo',
    affinityNotes: '+3.5% payout per completed Nightjar job, capped at +15%',
    uiRole: 'command',
  },
  {
    id: 'solgrid-dynamics',
    name: 'Solgrid Dynamics',
    color: '#ff8c42',
    initial: 'SD',
    unlockTier: 4,
    projectType: 'Solar-grid expansion and high-purity silicon',
    mineralPreferences: ['silicon', 'ice'],
    payoutPremium: 0.24,
    affinityBonusPerMission: 0.025,
    payoutNotes: '24% premium on solar-grid inputs',
    affinityNotes: '+2.5% payout per completed Solgrid job, capped at +15%',
    uiRole: 'command',
  },
  {
    id: 'lumen-research',
    name: 'Lumen Research',
    color: '#f5a623',
    initial: 'LR',
    unlockTier: 4,
    projectType: 'Strategic sample reserve and sensor research',
    mineralPreferences: ['gold', 'rare', 'cobalt'],
    payoutPremium: 0.30,
    affinityBonusPerMission: 0.035,
    payoutNotes: '30% premium on research-critical minerals',
    affinityNotes: '+3.5% payout per completed Lumen job, capped at +15%',
    uiRole: 'science',
  },
  {
    id: 'pioneer-works',
    name: 'Pioneer Works',
    color: '#39d36a',
    initial: 'PW',
    unlockTier: 5,
    projectType: 'Base expansion reserves and general frontier supply',
    mineralPreferences: ['iron', 'silicon', 'nickel'],
    payoutPremium: 0.20,
    affinityBonusPerMission: 0.025,
    payoutNotes: '20% premium on balanced expansion cargo',
    affinityNotes: '+2.5% payout per completed Pioneer job, capped at +15%',
    uiRole: 'starter',
  },
]

export const CONTRACTORS: Record<string, Contractor> = Object.fromEntries(
  CONTRACTOR_SLOTS.map(c => [c.id, toContractor(c)])
)

export function toContractor(slot: ContractorSlot): Contractor {
  return {
    id: slot.id,
    name: slot.name,
    color: slot.color,
    initial: slot.initial,
    unlockTier: slot.unlockTier,
    projectType: slot.projectType,
    mineralPreferences: slot.mineralPreferences,
    payoutPremium: slot.payoutPremium,
    affinityBonusPerMission: slot.affinityBonusPerMission,
  }
}

export function contractorAffinityBonus(contractor: Contractor, completedJobs = 0): number {
  return Math.min(MAX_AFFINITY_BONUS, completedJobs * contractor.affinityBonusPerMission)
}

export function contractorPayoutMultiplier(contractor: Contractor, completedJobs = 0): number {
  return 1 + contractor.payoutPremium + contractorAffinityBonus(contractor, completedJobs)
}

export function contractorUnlocked(contractor: Contractor, sequence: number): boolean {
  return contractor.unlockTier <= sequence
}
