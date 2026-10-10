import type { TessClassification, TessVerdict } from '@/lib/data'
import type { CompletedMissionRecord, Player } from '@/lib/game-types'
import { TRAINING_ID_PREFIX } from '@/lib/visual-fixtures'

const VERDICT_LABEL: Record<TessVerdict, string> = {
  planet: 'Planet candidate',
  not_planet: 'No planet signal',
  unsure: 'Unsure',
}

/**
 * Transit classifications as Mission Log entries. The log only ever held
 * completed missions, so a player's transit work from their own telescope
 * never appeared in it even though it is saved on the player.
 * Flight Plan training verdicts are excluded: they are not real subjects.
 */
export function transitLogRecords(player: Pick<Player, 'tessClassifications'>): CompletedMissionRecord[] {
  return Object.values(player.tessClassifications ?? {})
    .filter((entry: TessClassification) => !!entry && !entry.subjectId.startsWith(TRAINING_ID_PREFIX) && Number.isFinite(entry.submittedAt))
    .map(entry => ({
      id: `transit:${entry.subjectId}`,
      title: 'Transit classified',
      targetName: VERDICT_LABEL[entry.verdict] ?? VERDICT_LABEL.unsure,
      completedAt: entry.submittedAt,
      runId: `transit:${entry.subjectId}`,
      kind: 'transit' as const,
    }))
}
