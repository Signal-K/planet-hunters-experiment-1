import type { DailyQuestTemplate } from './types'
import { DAILY_QUEST_REWARDS } from './economy'

export const DAILY_QUEST_TEMPLATES: DailyQuestTemplate[] = [
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
]

export function getDailyQuestTemplate(id: string): DailyQuestTemplate | undefined {
  return DAILY_QUEST_TEMPLATES.find(q => q.id === id)
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}
