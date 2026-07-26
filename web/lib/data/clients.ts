// Landnam game data — clients and client economy

import type { Client, ClientSlot } from './types'

export const CLIENT_COOLDOWN_MS = 30 * 60 * 1000
export const CLIENT_STREAK_LIMIT = 2
export const MAX_AFFINITY_BONUS = 0.15
export const CLIENT_AFFINITY_MISSION_THRESHOLD = 5

export const CLIENT_SLOTS: ClientSlot[] = [
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
    // Silicate/stony (S-type) bulk rock, not carbonaceous — "carbon" here
    // didn't match a real S-archetype composition (see target-archetypes.ts);
    // carbon now belongs to Ceres Volatiles Collective's C-type profile.
    mineralPreferences: ['iron', 'silicon'],
    payoutPremium: 0.18,
    affinityBonusPerMission: 0.02,
    payoutNotes: '18% premium on high-volume construction cargo',
    affinityNotes: '+2% payout per completed Atlas job, capped at +15%',
    uiRole: 'bulk',
  },
  {
    id: 'ceres-volatiles-collective',
    name: 'Ceres Volatiles Collective',
    color: '#5ee6c0',
    initial: 'CV',
    unlockTier: 2,
    projectType: 'Volatile extraction and carbonaceous feedstock reserves',
    // Dedicated C-type (carbonaceous/volatiles) specialist — the roster
    // otherwise skewed heavily M-type (platinum-group); carbon/ice/hydrogen
    // mirror the C archetype's common/uncommon pool in target-archetypes.ts.
    mineralPreferences: ['carbon', 'ice', 'hydrogen'],
    payoutPremium: 0.20,
    affinityBonusPerMission: 0.025,
    payoutNotes: '20% premium on carbonaceous and volatile feedstock',
    affinityNotes: '+2.5% payout per completed Ceres job, capped at +15%',
    uiRole: 'prospect',
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
    // "Rare gas capture" is an icy/gas-giant profile, not a metallic one —
    // 'gold' didn't belong here (see target-archetypes.ts); 'hydrogen'
    // matches both icy and gas-giant pools instead.
    mineralPreferences: ['rare', 'hydrogen'],
    payoutPremium: 0.28,
    affinityBonusPerMission: 0.035,
    payoutNotes: '28% premium on rare strategic cargo',
    affinityNotes: '+3.5% payout per completed Nightjar job, capped at +15%',
    uiRole: 'command',
  },
  {
    id: 'vulcan-core-metallurgy',
    name: 'Vulcan Core Metallurgy',
    color: '#e85d5d',
    initial: 'VC',
    unlockTier: 4,
    projectType: 'Deep metallic-core assay and platinum-group refinement',
    // Second M-type (metallic prospecting) specialist beyond Helios/Ferrum/
    // Arcturus, which already lean platinum-group at L1 — this one targets
    // the M archetype's rare/exotic tier instead of duplicating them.
    mineralPreferences: ['platinum', 'rhodium'],
    payoutPremium: 0.26,
    affinityBonusPerMission: 0.03,
    payoutNotes: '26% premium on refined platinum-group core assay',
    affinityNotes: '+3% payout per completed Vulcan job, capped at +15%',
    uiRole: 'prospect',
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

export const CLIENTS: Record<string, Client> = Object.fromEntries(
  CLIENT_SLOTS.map(c => [c.id, toClient(c)])
)

export function toClient(slot: ClientSlot): Client {
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
    uiRole: slot.uiRole,
    payoutNotes: slot.payoutNotes,
    affinityNotes: slot.affinityNotes,
  }
}

export function clientAffinityBonus(client: Client, completedJobs = 0): number {
  return Math.min(MAX_AFFINITY_BONUS, completedJobs * client.affinityBonusPerMission)
}

export function clientPayoutMultiplier(client: Client, completedJobs = 0): number {
  return 1 + client.payoutPremium + clientAffinityBonus(client, completedJobs)
}

export function clientUnlocked(client: Client, sequence: number): boolean {
  return client.unlockTier <= sequence
}
