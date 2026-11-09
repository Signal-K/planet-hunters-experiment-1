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
