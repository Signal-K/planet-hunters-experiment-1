import { describe, expect, it } from 'vitest'
import { orionidsResearchStep } from '@/lib/orionids/chain'
import { getSkyEvent } from './sky-events'
import { ORIONIDS_NIGHT_RUN_ID, ORIONIDS_SHOWER_TARGET_ID, showerRunMission } from './missions'
import { getShower, resolveShower, SHOWERS, showerForResource, showerForRunMission, showerInstrument, showerPreset } from './showers'

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

describe('one declaration per shower (SSL-774)', () => {
  it('resolves window, rate, badge rule and instrument from the declaration', () => {
    const leonids = resolveShower('leonids-2026')!
    expect(leonids.preset.resourceId).toBe(leonids.resourceId)
    expect(leonids.instrument.callsign).toBe('LEO-1')
    expect(leonids.badgeAfterMissions).toBe(true)
    expect(Date.parse(leonids.preset.startUtc)).toBeLessThan(Date.parse(leonids.preset.endUtc))
    expect(resolveShower('draconids-2026')).toBeUndefined()
  })

  it('keeps the Orionid run and field ids the code uses equal to the declaration', () => {
    const orionids = getShower('orionids-2026')!
    expect(ORIONIDS_NIGHT_RUN_ID).toBe(orionids.runMissionId)
    expect(ORIONIDS_SHOWER_TARGET_ID).toBe(orionids.targetId)
  })

  it('gives every shower a distinct run, field and fragment that lead back to it', () => {
    for (const shower of SHOWERS) {
      expect(showerForRunMission(shower.runMissionId)?.id).toBe(shower.id)
      expect(showerForResource(shower.resourceId)?.id).toBe(shower.id)
      expect(showerRunMission(shower.id).targetId).toBe(shower.targetId)
    }
    expect(new Set(SHOWERS.map(s => s.runMissionId)).size).toBe(SHOWERS.length)
    expect(new Set(SHOWERS.map(s => s.targetId)).size).toBe(SHOWERS.length)
    expect(new Set(SHOWERS.map(s => s.resourceId)).size).toBe(SHOWERS.length)
  })
})
