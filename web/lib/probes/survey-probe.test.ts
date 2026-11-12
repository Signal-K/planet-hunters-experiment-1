import { describe, expect, it } from 'vitest'
import { TARGETS } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { explorerSteps, traderSteps } from '@/lib/research/paths'
import {
  PROBE_SECTOR_HOURS,
  bodyBands,
  bodySurvey,
  collectProbeData,
  mergeProbes,
  newSectors,
  nextSector,
  placeProbe,
  probeMission,
  probeOffers,
  sectorDeposits,
  sectorIds,
  sectorSpectrum,
  sectorsMapped,
} from './survey-probe'

const eros = TARGETS.find(target => target.id === 'eros')!
const NOW = Date.parse('2026-11-11T12:00:00Z')

describe('survey probes (SSL-773)', () => {
  it('fixes every sector, and every mineral the body holds turns up somewhere', () => {
    expect(sectorDeposits(eros, '2_1')).toEqual(sectorDeposits(eros, '2_1'))
    const all = new Set(sectorIds().flatMap(id => sectorDeposits(eros, id)))
    expect([...all].sort()).toEqual([...eros.minerals].sort())
  })

  it('draws a dip at each deposit band, below the continuum', () => {
    const sector = sectorIds().find(id => sectorDeposits(eros, id).length > 0)!
    const deposit = sectorDeposits(eros, sector)[0]
    const band = bodyBands(eros).find(b => b.mineral === deposit)!
    const spectrum = sectorSpectrum(eros, sector, 211)
    const at = Math.round(((band.nm - 400) / 2100) * 210)
    expect(spectrum[at]).toBeLessThan(Math.max(...spectrum) - 0.15)
  })

  it('stays in orbit once placed, and offers the nearest bodies without a probe', () => {
    const p = placeProbe({}, 'eros', NOW)
    expect(placeProbe(p, 'eros', NOW + 1)).toBe(p)
    expect(probeOffers(TARGETS, p).some(t => t.id === 'eros')).toBe(false)
    expect(probeOffers(TARGETS, {})).toHaveLength(2)
    expect(probeMission(eros, 4).payload?.instrumentId).toBe('survey-probe')
  })

  it('maps one sector every few hours on its own, and the whole body in two days', () => {
    const record = placeProbe<Pick<Player, 'probes'>>({}, 'eros', NOW).probes!.eros
    const hour = 3_600_000
    expect(sectorsMapped(record, NOW + hour)).toHaveLength(0)
    expect(sectorsMapped(record, NOW + PROBE_SECTOR_HOURS * hour * 5)).toHaveLength(5)
    expect(nextSector(record, NOW)?.at).toBe(NOW + PROBE_SECTOR_HOURS * hour)
    expect(sectorsMapped(record, NOW + 48 * hour)).toHaveLength(sectorIds().length)
    expect(nextSector(record, NOW + 48 * hour)).toBeNull()
  })

  it('finds every mineral type with tonnes once the basic scan is done', () => {
    const record = placeProbe<Pick<Player, 'probes'>>({}, 'eros', NOW).probes!.eros
    const survey = bodySurvey(eros, record, NOW + 48 * 3_600_000)
    expect(survey.map(row => row.mineral)).toEqual(eros.minerals)
    expect(survey.every(row => row.tonnes > 0 && row.sectors > 0)).toBe(true)
  })

  it('downloads new sectors as one probe observation, and nothing twice', () => {
    const later = NOW + 6 * 3_600_000
    const fresh: Pick<Player, 'probes' | 'researchStamps'> = { researchStamps: {} }
    let p = placeProbe(fresh, 'eros', NOW)
    expect(collectProbeData(p, TARGETS, NOW)).toBe(p)
    p = collectProbeData(p, TARGETS, later)
    expect(Object.keys(p.probes!.eros.readings)).toHaveLength(3)
    expect(p.researchStamps?.['2026-11-11']).toContain('probe-observation')
    expect(newSectors(p.probes!.eros, later)).toHaveLength(0)
    expect(collectProbeData(p, TARGETS, later)).toBe(p)
  })

  it('merges two saves: every reading, the earlier launch', () => {
    const a = { eros: { launchedAt: 5, readings: { '0_0': { at: 6, marked: [], deposits: [] } } } }
    const b = { eros: { launchedAt: 3, readings: { '1_0': { at: 7, marked: [], deposits: [] } } } }
    const merged = mergeProbes(a, b)!
    expect(merged.eros.launchedAt).toBe(3)
    expect(Object.keys(merged.eros.readings).sort()).toEqual(['0_0', '1_0'])
  })

  it('adds a probe step before the Breakthrough on both paths when a probe is up', () => {
    const explorer = explorerSteps({ hasDiscovery: false, eventName: null, hasProbe: true }).map(s => s.id)
    const trader = traderSteps({ eventName: null, hasProbe: true }).map(s => s.id)
    expect(explorer.slice(-2)).toEqual(['probe', 'breakthrough'])
    expect(trader.slice(-2)).toEqual(['probe', 'breakthrough'])
    expect(explorerSteps({ hasDiscovery: false, eventName: null }).some(s => s.id === 'probe')).toBe(false)
  })
})
