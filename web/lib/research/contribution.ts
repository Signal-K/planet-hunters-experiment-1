import type { Player } from '@/lib/game-types'
import type { PassportResponse } from './passport'
import { weekKey } from './paths'
import { stampDayKey, type StampKind } from './stamps'

/** A result reads receipts; it never awards or rewrites historical fragments. */
export function contributionReadout(player: Pick<Player, 'researchStamps'>, receipt: PassportResponse | null, kind: StampKind, at: number) {
  if (!Number.isFinite(at) || at <= 0) return []
  const day = stampDayKey(at)
  const local = player.researchStamps?.[day]?.includes(kind) ?? false
  const confirmed = local && (receipt?.confirmedStamps?.[day]?.includes(kind) ?? false)
  const week = receipt?.weeks.find(row => row.week === weekKey(at))
  return [
    { label: 'Research', value: confirmed ? '1 daily stamp confirmed' : local ? '1 daily stamp pending sync' : 'No additional research stamp' },
    { label: 'Passport', value: week ? `${week.mine}/7 days · community ${week.total}/${week.goal}` : 'Awaiting server progress' },
  ]
}
