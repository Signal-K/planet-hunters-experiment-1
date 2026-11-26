import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { applyStartScan, applyResolveScan, scanProgress, SURVEY_SCAN_DURATION_MS, applyScanFollowUpBonus, followUpProject, scanAsksFollowUp, FOLLOW_UP_BONUS_FRAGMENTS } from './SurveyScanSystem'

const state = (player: object) => ({ player } as unknown as GameState)

it('keeps the scan running for two minutes and awards completion only once', () => {
  const start = 1000
  const scanning = applyStartScan(state({ freeOperations: true, transitSatelliteLaunchedAt: 1, researchXP: 0 }), 'mercury', start)
  expect(SURVEY_SCAN_DURATION_MS).toBe(120_000)
  expect(applyResolveScan(scanning, start + 12_000)).toBe(scanning)
  expect(scanProgress(scanning.player, start + 60_000)).toBe(0.5)
  expect(applyResolveScan(scanning, start + 119_999)).toBe(scanning)
  const done = applyResolveScan(scanning, start + 120_000)
  expect(done.player.activeScan).toBeNull()
  expect(done.player.chartedBodies?.mercury).toBeDefined()
  expect(applyResolveScan(done, start + 240_000)).toBe(done)
})

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
