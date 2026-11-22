import { describe, expect, it } from 'vitest'
import { TARGETS, MINERAL_META } from '@/lib/data'
import { miningIntelligence } from './mining-intelligence'
import { sectorDeposits, surveyOf } from './survey-probe'
import type { Player } from '@/lib/game-types'

const eros = TARGETS.find(target => target.id === 'eros')!
const rarity = (id: string) => MINERAL_META[id]?.rarity
const reading = (id: string) => ({ at: 10, marked: [], deposits: sectorDeposits(eros, id) })

describe('mining intelligence', () => {
  it('uses downloaded sectors, not elapsed probe time, without mutating the save', () => {
    const player = { probes: { eros: { launchedAt: 0, readings: { '0_0': reading('0_0') } } } }
    const before = structuredClone(player)
    const evidence = miningIntelligence(player, eros, rarity)
    expect(evidence.sectors).toEqual(['0_0'])
    expect(evidence.findings).toEqual(surveyOf(eros, ['0_0'], rarity))
    expect(player).toEqual(before)
    expect(miningIntelligence({ probes: { eros: { launchedAt: 0, readings: {} } } }, eros).findings).toEqual([])
  })

  it('unions valid personal and shared sectors once, preserving the source counts', () => {
    const player: Pick<Player, 'probes' | 'agencyCommunity'> = {
      probes: { eros: { launchedAt: 0, readings: { '0_0': reading('0_0'), invalid: reading('0_0') } } },
      agencyCommunity: { projects: {
        'asteroid-discovery': { contributions: 0, donatedPerDay: 0 }, 'exoplanet-hunters': { contributions: 0, donatedPerDay: 0 },
        'saturn-storms': { contributions: 0, donatedPerDay: 0 }, 'deposit-survey': { contributions: 0, donatedPerDay: 0 }, 'meteor-echoes': { contributions: 0, donatedPerDay: 0 },
      }, surveys: { eros: ['0_0', '1_0', '1_0', '99_99'] }, worlds: {}, siteUnlocks: [] },
    }
    const evidence = miningIntelligence(player, eros, rarity)
    expect(evidence).toMatchObject({ sectors: ['0_0', '1_0'], totalSectors: 24, personalSectors: 1, sharedSectors: 2 })
    expect(evidence.findings).toEqual(surveyOf(eros, ['0_0', '1_0'], rarity))
    expect(miningIntelligence({ agencyCommunity: player.agencyCommunity }, eros, rarity).findings).toEqual(evidence.findings)
  })

  it('does not leak another body’s readings or invent estimates for an unmapped destination', () => {
    const mercury = TARGETS.find(target => target.id === 'mercury')!
    const evidence = miningIntelligence({ probes: { eros: { launchedAt: 0, readings: { '0_0': reading('0_0') } } } }, mercury)
    expect(evidence.sectors).toEqual([])
    expect(evidence.findings).toEqual([])
  })
})
