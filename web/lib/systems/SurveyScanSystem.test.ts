import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { applyScanFollowUpBonus, followUpProject, scanAsksFollowUp, FOLLOW_UP_BONUS_FRAGMENTS } from './SurveyScanSystem'

const state = (player: object) => ({ player } as unknown as GameState)

describe('scan follow-up', () => {
  it('routes bodies to the instrument that analyses them', () => {
    expect(followUpProject({ id: 'ceres', type: 'asteroid' })).toBe('asteroid')
    expect(followUpProject({ id: 'enceladus', type: 'planet' })).toBe('saturn')
    expect(followUpProject({ id: 'mars', type: 'planet' })).toBe('tess')
  })
  it('is deterministic for the same scan', () => {
    expect(scanAsksFollowUp('mars', 5000)).toBe(scanAsksFollowUp('mars', 5000))
  })
  it('pays once, only for the matching instrument', () => {
    const s = state({ scanFollowUp: { targetId: 'mars', project: 'tess', at: 1 }, researchFragments: 2, researchXP: 0 })
    expect(applyScanFollowUpBonus(s, 'asteroid')).toBe(s)
    const paid = applyScanFollowUpBonus(s, 'tess')
    expect(paid.player.scanFollowUp).toBeNull()
    expect(paid.player.researchFragments).toBe(2 + FOLLOW_UP_BONUS_FRAGMENTS)
    expect(applyScanFollowUpBonus(paid, 'tess')).toBe(paid)
  })
})
