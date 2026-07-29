import type { DailyQuestTemplate } from './types'
import { DAILY_QUEST_REWARDS } from './economy'

export const DAILY_QUEST_TEMPLATES: DailyQuestTemplate[] = [
  {
    id: 'daily-scan-5-asteroids',
    kind: 'scan',
    title: 'Orbital Survey Run',
    brief: 'Run the station scanner on five different asteroid targets before the day resets.',
    targetScope: 'any-asteroid',
    count: 5,
    payout: { francs: DAILY_QUEST_REWARDS.medium, affinity: 12 },
    requiresScannerBuilt: true,
  },
  {
    id: 'daily-land-rover-any',
    kind: 'land',
    title: 'Surface Contact',
    brief: 'Deploy a rover at any survey-cleared target to collect surface samples.',
    targetScope: 'any',
    count: 1,
    payout: { francs: DAILY_QUEST_REWARDS.large, affinity: 15 },
    requiresSurveyClear: true,
  },
  {
    id: 'daily-map-asteroid',
    kind: 'map',
    title: 'Deposit Mapping',
    brief: 'Accumulate the required scans to fully map one asteroid target today.',
    targetScope: 'any-asteroid',
    count: 1,
    payout: { francs: DAILY_QUEST_REWARDS.small, affinity: 10 },
    requiresScannerBuilt: true,
  },
]

export function getDailyQuestTemplate(id: string): DailyQuestTemplate | undefined {
  return DAILY_QUEST_TEMPLATES.find(q => q.id === id)
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}
