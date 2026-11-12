import { describe, expect, it } from 'vitest'
import { TARGETS } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { MINERAL_META } from '@/lib/data/minerals'
import { buildRuntimeCatalog } from '@/lib/runtimeCatalog'
import { STATIC_CATALOG as CATALOG } from '@/lib/catalog'
import { probeContracts, probeRunId, probeRunMission } from './probe-offers'
import { collectProbeData, downloadedSurvey, placeProbe, surveyOf, sectorIds } from './survey-probe'

const eros = TARGETS.find(target => target.id === 'eros')!
const rarity = (id: string) => MINERAL_META[id]?.rarity
const full = surveyOf(eros, sectorIds(), rarity)

describe('what a probe survey opens (SSL-773)', () => {
  it('offers nothing before the probe has found anything', () => {
    expect(probeRunMission(eros, [])).toBeNull()
    expect(probeContracts(eros, [])).toEqual([])
  })

  it('makes a free run to the body that mines the most valuable deposits found', () => {
    const run = probeRunMission(eros, full)!
    expect(run.id).toBe(probeRunId('eros'))
    expect(run.targetId).toBe('eros')
    expect(run.client).toBeUndefined()
    const prices = Object.keys(run.requires.minerals).map(id => MINERAL_META[id].price)
    expect(prices).toEqual([...prices].sort((a, b) => b - a))
    expect(Object.keys(run.requires.minerals).every(id => eros.minerals.includes(id))).toBe(true)
  })

  it('has clients ask for found minerals they want, never Earth-abundant ones or ones already flown', () => {
    const contracts = probeContracts(eros, full)
    expect(contracts.length).toBeGreaterThan(0)
    for (const contract of contracts) {
      const [mineral] = Object.keys(contract.requires.minerals)
      expect(contract.targetId).toBe('eros')
      expect(contract.client).toBeTruthy()
      expect(MINERAL_META[mineral].earthAbundant).toBeFalsy()
    }
    const flown = new Set([contracts[0].id])
    expect(probeContracts(eros, full, flown).some(c => c.id === contracts[0].id)).toBe(false)
  })

  it('puts the run and contracts on the board once the survey is downloaded', () => {
    const now = Date.parse('2026-11-11T12:00:00Z')
    const start: Pick<Player, 'probes' | 'researchStamps' | 'completedMissions'> = { researchStamps: {} }
    let player = placeProbe(start, 'eros', now)
    player = collectProbeData(player, TARGETS, now + 30 * 3_600_000)
    expect(downloadedSurvey(eros, player.probes!.eros).length).toBeGreaterThan(0)
    const catalog = buildRuntimeCatalog({ catalog: CATALOG, freeOperations: true, missionsDone: 6, player })
    expect(catalog.missions.some(m => m.id === probeRunId('eros'))).toBe(true)
    expect(catalog.missions.some(m => m.id.startsWith('probe-contract-eros-'))).toBe(true)
  })
})
