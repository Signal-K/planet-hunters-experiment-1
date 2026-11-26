import { describe, expect, it } from 'vitest'
import { contributionReadout } from './contribution'
import type { PassportResponse } from './passport'
const at = Date.parse('2026-11-24T12:00:00Z')
const player = { researchStamps: { '2026-11-24': ['probe-observation' as const] }, researchFragments: 17 }
const week = { week: '2026-11-23', total: 41, mine: 2, goal: 100, reachedAt: null, earned: false }
describe('contribution receipts', () => {
  it('keeps missing and unrelated receipts pending, even with a full shared bar', () => {
    for (const receipt of [null, { weeks: [{ ...week, total: 100 }] }, { weeks: [week], confirmedStamps: { '2026-11-23': ['probe-observation'] } }, { weeks: [week], confirmedStamps: { '2026-11-24': ['classification'] } }] as Array<PassportResponse | null>) {
      expect(contributionReadout(player, receipt, 'probe-observation', at)[0].value).toBe('1 daily stamp pending sync')
    }
  })
  it('confirms the saved day and kind and never mutates rewards on replay', () => {
    const before = structuredClone(player)
    const receipt: PassportResponse = { weeks: [week], confirmedStamps: player.researchStamps }
    const rows = contributionReadout(player, receipt, 'probe-observation', at)
    expect(rows.map(row => row.value)).toEqual(['1 daily stamp confirmed', '2/7 days · community 41/100'])
    expect(contributionReadout(player, receipt, 'probe-observation', at)).toEqual(rows)
    expect(player).toEqual(before)
    expect(contributionReadout({ researchStamps: {} }, receipt, 'probe-observation', at)[0].value).toBe('No additional research stamp')
  })
})
