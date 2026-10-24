import type { CompletedMissionRecord, Player } from '@/lib/game-types'

export type OrionidsProgressEvidence = {
  attempted: boolean
  completed: boolean
  surfaceCompleted: boolean
  completionAt: number | null
}

/**
 * Until 24 Oct 2026 the Orionids card on the Events board opened an ordinary Free Run, so players who
 * "did the event" in that window hauled hydrogen. A hydrogen haul finished while that was live counts as
 * an attempt. The credit only raises the event stage; it never lowers anything.
 */
export const LEGACY_HYDROGEN_EVENT_START_MS = Date.UTC(2026, 9, 19, 0, 0, 0)
export const LEGACY_HYDROGEN_EVENT_END_MS = Date.UTC(2026, 9, 24, 12, 0, 0)

function isLegacyHydrogenEventRun(record: Partial<CompletedMissionRecord>): boolean {
  const at = record.completedAt
  return typeof at === 'number' && at >= LEGACY_HYDROGEN_EVENT_START_MS && at < LEGACY_HYDROGEN_EVENT_END_MS
    && /^freeops-/.test(record.id ?? '') && /hydrogen/i.test(record.title ?? '')
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
    || (player.completedMissions ?? []).some(isLegacyHydrogenEventRun)
  const completionAt = completed.reduce<number | null>((latest, record) =>
    typeof record.completedAt === 'number' && Number.isFinite(record.completedAt)
      ? Math.max(latest ?? 0, record.completedAt)
      : latest, null)
  return { attempted, completed: completed.length > 0, surfaceCompleted, completionAt }
}
