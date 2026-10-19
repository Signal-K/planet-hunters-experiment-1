// Queue Orionids find vouchers and meteorite mastery through the Landnam outbox.
// Atlas agent bc-2ccacfd8 was not readable from this run. The row shape matches
// the shared schema { event_id, tier, source, earned_at } plus meteorite_mastery.

import { pbLandnam } from '@/lib/pb-landnam'
import { queueUpsert } from '@/lib/offline/pbOutbox'
import { ORIONIDS_EVENT_ID, ORIONIDS_SOURCE, pocketBaseId, type OrionidsFind } from './finds'

function filterValue(value: string): string {
  return value.replace(/["\\]/g, '')
}

export function queueOrionidsFind(find: OrionidsFind): void {
  const user = pbLandnam.authStore.record?.id
  if (!user) return
  const subjectId = filterValue(find.subjectId)
  const id = pocketBaseId(`event_badges:${user}:${ORIONIDS_EVENT_ID}:${subjectId}`)
  void queueUpsert(
    'event_badges',
    `user = "${user}" && event_id = "${ORIONIDS_EVENT_ID}" && subject_id = "${subjectId}"`,
    {
      user,
      event_id: ORIONIDS_EVENT_ID,
      tier: find.tier,
      source: ORIONIDS_SOURCE,
      earned_at: find.earnedAt,
      subject_id: subjectId,
      marker: find.marker,
      voucher: find.voucher,
    },
    id,
  )
}

export function queueMeteoriteMastery(earnedAt: number): void {
  const user = pbLandnam.authStore.record?.id
  if (!user) return
  void queueUpsert(
    'meteorite_mastery',
    `user = "${user}"`,
    {
      user,
      level: 1,
      source: ORIONIDS_SOURCE,
      event_id: ORIONIDS_EVENT_ID,
      earned_at: earnedAt,
    },
    pocketBaseId(`meteorite_mastery:${user}`),
  )
}
