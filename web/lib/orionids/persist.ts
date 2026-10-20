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

export function queueEventBadge(badge: {
  eventId: string
  tier: OrionidsFind['tier']
  earnedAt: number
  subjectId: string
  marker?: string
}): void {
  const user = pbLandnam.authStore.record?.id
  if (!user) return
  const eventId = filterValue(badge.eventId)
  const subjectId = filterValue(badge.subjectId)
  void queueUpsert(
    'event_badges',
    `user = "${user}" && event_id = "${eventId}" && subject_id = "${subjectId}"`,
    {
      user,
      event_id: eventId,
      tier: badge.tier,
      source: ORIONIDS_SOURCE,
      earned_at: badge.earnedAt,
      subject_id: subjectId,
      marker: badge.marker ?? eventId,
      voucher: '',
    },
    pocketBaseId(`event_badges:${user}:${eventId}:${subjectId}`),
  )
}

export function queueFragmentLedger(input: { caught: number; redeemed: number; level: number; earnedAt: number }): void {
  const user = pbLandnam.authStore.record?.id
  if (!user || input.caught <= 0) return
  void queueUpsert(
    'meteorite_mastery',
    `user = "${user}"`,
    {
      user,
      level: Math.max(0, Math.floor(input.level)),
      fragments: Math.floor(input.caught),
      redeemed: Math.floor(input.redeemed),
      source: ORIONIDS_SOURCE,
      event_id: ORIONIDS_EVENT_ID,
      earned_at: input.earnedAt,
    },
    pocketBaseId(`meteorite_mastery:${user}`),
  )
}

export async function readAtlasLookedUp(): Promise<{ tier: 'gold' | 'silver'; earnedAt: number } | null> {
  const user = pbLandnam.authStore.record?.id
  if (!user) return null
  try {
    const row = await pbLandnam.collection('event_badges').getFirstListItem(
      `user = "${filterValue(user)}" && event_id = "orionids-2026" && subject_id = "check-in" && marker = "after-moonset"`,
    )
    const tier = typeof row.get === 'function' ? row.get('tier') : (row as { tier?: unknown }).tier
    const earned = typeof row.get === 'function' ? row.get('earned_at') : (row as { earned_at?: unknown }).earned_at
    if (tier !== 'gold' && tier !== 'silver') return null
    return { tier, earnedAt: typeof earned === 'number' && Number.isFinite(earned) ? earned : Date.now() }
  } catch {
    return null
  }
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
