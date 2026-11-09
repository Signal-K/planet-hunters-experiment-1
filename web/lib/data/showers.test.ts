import { describe, expect, it } from 'vitest'
import { orionidsResearchStep } from '@/lib/orionids/chain'
import { getSkyEvent } from './sky-events'
import { getShower, SHOWERS, showerInstrument, showerPreset } from './showers'

describe('shower declarations (SSL-774)', () => {
  it('declares Orionids, Leonids and Geminids, each with a window, rate, resource and instrument', () => {
    expect(SHOWERS.map(s => s.id)).toEqual(['orionids-2026', 'leonids-2026', 'geminids-2026'])
    for (const shower of SHOWERS) {
      expect(getSkyEvent(shower.id)?.badgeAfterMissions).toBe(true)
      expect(showerPreset(shower.id)?.peakRatePerMinute).toBeGreaterThan(0)
      expect(showerInstrument(shower.id).callsign).not.toBe('RX-1')
    }
  })

  it('words the event step from the declaration, before and after taking part', () => {
    expect(orionidsResearchStep(0).title).toBe('Orionids: catch and contribute fragments')
    expect(orionidsResearchStep(1).brief).toContain('ORI‑1 is still listening')
    expect(orionidsResearchStep(0, 'leonids-2026').title).toBe('Leonids: catch and contribute fragments')
    expect(orionidsResearchStep(2, 'geminids-2026').brief).toContain('GEM‑1')
    expect(getShower('nope')).toBeUndefined()
  })
})

describe('probe drop (SSL-771)', () => {
  const LEONIDS_PEAK = Date.parse('2026-11-17T12:00:00Z')

  it('is on the board only while a shower window is open, and never for the Orionids run', async () => {
    const { liveShowers, probeMission } = await import('./showers')
    expect(liveShowers(LEONIDS_PEAK).map(s => s.id)).toEqual(['leonids-2026'])
    expect(liveShowers(Date.parse('2026-11-09T12:00:00Z'))).toEqual([])
    expect(liveShowers(Date.parse('2026-10-29T12:00:00Z'))).toEqual([])
    const { generateSelfDirectedMiningPool } = await import('./missions')
    expect(generateSelfDirectedMiningPool(LEONIDS_PEAK).some(m => m.id === probeMission(getShower('leonids-2026')!).id)).toBe(true)
    expect(generateSelfDirectedMiningPool(Date.parse('2026-11-09T12:00:00Z')).some(m => m.payload?.type === 'probe')).toBe(false)
  })

  it('reads as launch, deploy, return and groups as exploration', async () => {
    const { probeMission } = await import('./showers')
    const { missionTypePrimer } = await import('./mission-primers')
    const { contractGroup } = await import('@/lib/contract-groups')
    const mission = probeMission(getShower('leonids-2026')!)
    expect(missionTypePrimer(mission).steps).toEqual(['Launch', 'Deploy', 'Return'])
    expect(contractGroup(mission)).toBe('exploration')
    expect(mission.targetId).toBe('eros')
  })
})
