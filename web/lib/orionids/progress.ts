import type { CompletedMissionRecord, Player } from '@/lib/game-types'

export type OrionidsProgressEvidence = {
  attempted: boolean
  completed: boolean
  surfaceCompleted: boolean
  completionAt: number | null
}

const hasEntries = (value: unknown): boolean =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0

const positiveNumber = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

function isOrionidsMission(record: Partial<CompletedMissionRecord>): boolean {
  return `${record.id ?? ''} ${record.title ?? ''}`.toLowerCase().includes('orionid')
}

export function detectOrionidsProgress(player: Pick<Player, 'completedMissions' | 'orionidsFragments' | 'orionidsNightCatches' | 'orionidsRunBaseline' | 'badges' | 'orionidsFinds'>): OrionidsProgressEvidence {
  const completed = (player.completedMissions ?? []).filter(isOrionidsMission)
  const surfaceCompleted = completed.some(record => /surface observation|field rover|rover observation/i.test(`${record.id} ${record.title}`))
  const attempted = positiveNumber(player.orionidsRunBaseline)
    || positiveNumber(player.orionidsFragments?.caught)
    || positiveNumber(player.orionidsNightCatches?.count)
    || hasEntries(player.orionidsFinds)
    || !!player.badges?.['orionids-2026']
    || completed.length > 0
  const completionAt = completed.reduce<number | null>((latest, record) =>
    typeof record.completedAt === 'number' && Number.isFinite(record.completedAt)
      ? Math.max(latest ?? 0, record.completedAt)
      : latest, null)
  return { attempted, completed: completed.length > 0, surfaceCompleted, completionAt }
}
