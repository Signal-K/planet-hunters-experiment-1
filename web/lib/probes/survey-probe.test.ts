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
  startProbeScan,
  probeScanLevel,
  probePass,
  logProbeSpectrum,
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
    const record = startProbeScan(placeProbe<Pick<Player, 'probes'>>({}, 'eros', NOW), 'eros', NOW).probes!.eros
    const hour = 3_600_000
    expect(sectorsMapped(record, NOW + hour)).toHaveLength(0)
    expect(sectorsMapped(record, NOW + PROBE_SECTOR_HOURS * hour * 5)).toHaveLength(5)
    expect(nextSector(record, NOW)?.at).toBe(NOW + PROBE_SECTOR_HOURS * hour)
    expect(sectorsMapped(record, NOW + 48 * hour)).toHaveLength(sectorIds().length)
    expect(nextSector(record, NOW + 48 * hour)).toBeNull()
  })

  it('waits for SCAN, starts once and survives merging a stale waiting save', () => {
    const waiting = placeProbe<Pick<Player, 'probes'>>({}, 'eros', NOW)
    const at = NOW + 24 * 3_600_000
    expect(sectorsMapped(waiting.probes!.eros, at)).toEqual([])
    expect(nextSector(waiting.probes!.eros, at)).toBeNull()
    expect(collectProbeData(waiting, TARGETS, at)).toBe(waiting)
    const active = startProbeScan(waiting, 'eros', at)
    expect(startProbeScan(active, 'eros', at + 1000)).toBe(active)
    expect(nextSector(active.probes!.eros, at)?.at).toBe(at + 2 * 3_600_000)
    for (const probes of [mergeProbes(active.probes, waiting.probes), mergeProbes(waiting.probes, active.probes)]) {
      expect(sectorsMapped(probes!.eros, at + 2 * 3_600_000)).toHaveLength(1)
    }
    const legacy = { launchedAt: NOW, readings: {} }
    expect(sectorsMapped(legacy, at)).toHaveLength(12)
    expect(startProbeScan({ probes: { eros: legacy } }, 'eros', at).probes.eros).toBe(legacy)
  })

  it('finds every mineral type with tonnes once the basic scan is done', () => {
    const record = startProbeScan(placeProbe<Pick<Player, 'probes'>>({}, 'eros', NOW), 'eros', NOW).probes!.eros
    const survey = bodySurvey(eros, record, NOW + 48 * 3_600_000)
    expect(survey.map(row => row.mineral)).toEqual(eros.minerals)
    expect(survey.every(row => row.tonnes > 0 && row.sectors > 0)).toBe(true)
  })

  it('downloads new sectors as one probe observation, and nothing twice', () => {
    const later = NOW + 6 * 3_600_000
    const fresh: Pick<Player, 'probes' | 'researchStamps'> = { researchStamps: {} }
    let p = startProbeScan(placeProbe(fresh, 'eros', NOW), 'eros', NOW)
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

  it('requires surface, shallow and deep passes in order before readings; logging and merges cannot award twice', () => {
    let p = placeProbe<Pick<Player, 'probes' | 'researchStamps' | 'researchFragments'>>({ researchFragments: 19 }, 'eros', NOW, 1)
    expect(startProbeScan(p, 'eros', NOW, 2)).toBe(p)
    const hour = 3_600_000
    for (const level of [1, 2, 3] as const) {
      expect(probeScanLevel(p.probes!.eros)).toBe(level)
      const at = NOW + (level - 1) * 3 * hour
      p = startProbeScan(p, 'eros', at, level)
      const active = p
      expect(startProbeScan(p, 'eros', at + hour, level)).toBe(active)
      expect(sectorsMapped(probePass(p.probes!.eros, level), at + 2 * hour)).toHaveLength(1)
      expect(probeScanLevel(p.probes!.eros)).toBe(level)
      p = collectProbeData(p, TARGETS, at + 2 * hour)
    }
    expect(probeScanLevel(p.probes!.eros)).toBe(4)
    const stale = structuredClone(p)
    p = logProbeSpectrum(p, 'eros', '0_0', [1000, 1000, NaN, 2600], NOW + 9 * hour)
    expect(p.probes!.eros.readings['0_0'].analysis?.wavelengths).toEqual([1000])
    expect(p.researchFragments).toBe(19)
    expect(p.researchStamps?.['2026-11-11']).toContain('classification')
    expect(logProbeSpectrum(p, 'eros', '0_0', [1200], NOW + 24 * hour)).toBe(p)
    for (const merged of [mergeProbes(p.probes, stale.probes), mergeProbes(stale.probes, p.probes)]) {
      expect(probeScanLevel(merged!.eros)).toBe(4)
      expect(merged!.eros.readings['0_0'].analysis?.wavelengths).toEqual([1000])
      expect(Object.keys(merged!.eros.readings)).toHaveLength(1)
    }
  })

  it('adds a probe step before the Breakthrough on both paths when a probe is up', () => {
    const explorer = explorerSteps({ hasDiscovery: false, eventName: null, hasProbe: true }).map(s => s.id)
    const trader = traderSteps({ eventName: null, hasProbe: true }).map(s => s.id)
    expect(explorer.slice(-2)).toEqual(['probe', 'breakthrough'])
    expect(trader.slice(-2)).toEqual(['probe', 'breakthrough'])
    expect(explorerSteps({ hasDiscovery: false, eventName: null }).some(s => s.id === 'probe')).toBe(false)
  })
})
