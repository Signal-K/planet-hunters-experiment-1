import type { Mission } from '@/lib/data/types'

/**
 * SSL-699 (Liam, 01.11): offers on the contract board are grouped by mining, construction and exploration.
 * Construction is a build job; exploration is a rover, survey, scan, satellite or science flight; everything that
 * brings minerals home (deliveries and shower runs included) is mining.
 */
export type ContractGroup = 'mining' | 'construction' | 'exploration'

export const CONTRACT_GROUPS: readonly ContractGroup[] = ['mining', 'construction', 'exploration']

export const CONTRACT_GROUP_LABEL: Record<ContractGroup, string> = {
  mining: 'Mining',
  construction: 'Construction',
  exploration: 'Exploration',
}

type Groupable = Pick<Mission, 'construction' | 'payload' | 'survey' | 'tag'>

export function contractGroup(mission: Groupable): ContractGroup {
  if (mission.construction) return 'construction'
  const payload = mission.payload?.type
  if (payload === 'rover' || payload === 'satellite' || payload === 'deep-space-survey' || payload === 'probe') return 'exploration'
  if (mission.survey?.scanRequired || mission.tag === 'SCIENCE') return 'exploration'
  return 'mining'
}

/** How many offers each group holds, in board order; empty groups are left out. */
export function contractGroupCounts(missions: readonly Groupable[]): { group: ContractGroup; count: number }[] {
  return CONTRACT_GROUPS
    .map(group => ({ group, count: missions.filter(mission => contractGroup(mission) === group).length }))
    .filter(entry => entry.count > 0)
}
