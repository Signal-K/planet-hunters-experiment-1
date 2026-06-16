// Landnam game data — contractors

import type { Contractor, ContractorSlot } from './types'

export const CONTRACTOR_SLOTS: ContractorSlot[] = [
  { id: 'contractor-03a', name: 'Contractor Slot 03A', color: '#d97150', initial: '3A', unlockTier: 3, projectType: 'Starter smelting throughput', mineralPreferences: ['iron', 'silicon'], payoutNotes: 'Low rate, steady volume', affinityNotes: '+10 per delivery', uiRole: 'starter' },
  { id: 'contractor-03b', name: 'Contractor Slot 03B', color: '#9becff', initial: '3B', unlockTier: 3, projectType: 'Volatile handling', mineralPreferences: ['ice', 'carbon'], payoutNotes: 'Medium pay, bulk orders', affinityNotes: '+8 per delivery', uiRole: 'bulk' },
  { id: 'contractor-04a', name: 'Contractor Slot 04A', color: '#ffd166', initial: '4A', unlockTier: 4, projectType: 'Precious-metal assay', mineralPreferences: ['gold', 'nickel'], payoutNotes: 'High pay, low volume', affinityNotes: '+15 per delivery', uiRole: 'prospect' },
  { id: 'contractor-04b', name: 'Contractor Slot 04B', color: '#a8d8ea', initial: '4B', unlockTier: 4, projectType: 'Construction aggregates', mineralPreferences: ['iron', 'carbon'], payoutNotes: 'Low rate, large orders', affinityNotes: '+6 per delivery', uiRole: 'bulk' },
  { id: 'contractor-06a', name: 'Contractor Slot 06A', color: '#70e070', initial: '6A', unlockTier: 6, projectType: 'Deep-core sampling', mineralPreferences: ['nickel', 'cobalt'], payoutNotes: 'Mixed-bag premium', affinityNotes: '+12 per delivery', uiRole: 'prospect' },
  { id: 'contractor-06b', name: 'Contractor Slot 06B', color: '#c084ff', initial: '6B', unlockTier: 6, projectType: 'Rare-gas refining', mineralPreferences: ['rare', 'gold'], payoutNotes: 'High tier, small batches', affinityNotes: '+20 per delivery', uiRole: 'command' },
  { id: 'contractor-08a', name: 'Contractor Slot 08A', color: '#ff8c42', initial: '8A', unlockTier: 8, projectType: 'Solar-grade silicon', mineralPreferences: ['silicon', 'ice'], payoutNotes: 'Premium purity contracts', affinityNotes: '+10 per delivery', uiRole: 'command' },
  { id: 'contractor-08b', name: 'Contractor Slot 08B', color: '#5fcde6', initial: '8B', unlockTier: 8, projectType: 'Outer-belt volatiles', mineralPreferences: ['ice', 'carbon'], payoutNotes: 'Medium rate, special cargo', affinityNotes: '+8 per delivery', uiRole: 'bulk' },
  { id: 'contractor-10a', name: 'Contractor Slot 10A', color: '#f5a623', initial: '10A', unlockTier: 10, projectType: 'Strategic minerals', mineralPreferences: ['gold', 'rare', 'cobalt'], payoutNotes: 'High payout, rare minerals', affinityNotes: '+25 per delivery', uiRole: 'science' },
  { id: 'contractor-10b', name: 'Contractor Slot 10B', color: '#39d36a', initial: '10B', unlockTier: 10, projectType: 'Base expansion reserves', mineralPreferences: ['iron', 'silicon', 'nickel'], payoutNotes: 'Balanced late-game contracts', affinityNotes: '+12 per delivery', uiRole: 'starter' },
]

export const CONTRACTORS: Record<string, Contractor> = Object.fromEntries(
  CONTRACTOR_SLOTS.map(c => [c.id, { id: c.id, name: c.name, color: c.color, initial: c.initial }])
)
