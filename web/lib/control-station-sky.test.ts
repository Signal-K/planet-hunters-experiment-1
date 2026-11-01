import { describe, expect, it } from 'vitest'
import { buildControlStation } from '@/lib/control-station'
import { buildStationSky, stationHistory, stationTelescopes } from '@/lib/control-station-sky'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'

const NOW = Date.UTC(2026, 10, 1, 12)
const signals: InstrumentSignal[] = [
  { id: 'toi-1', kind: 'transit', instrumentId: 'transit-telescope', title: 'TOI 1', subtitle: '', inspectorScreen: 'galaxy' },
  { id: 'frame-1', kind: 'saturn', instrumentId: 'saturn-imager', title: 'F1', subtitle: '', inspectorScreen: 'saturn-storm-search' },
]
const player = {
  freeOperations: true,
  transitSatelliteLaunchedAt: 1,
  deepSpaceTelescopeBuilt: true,
  saturnImagerLaunchedAt: 1,
  tessClassifications: { 'tic-9': { verdict: 'planet', submittedAt: 5 } },
  asteroidClassifications: { 'neo-2': { verdict: 'likely_real', submittedAt: 9 } },
}

describe('control station sky', () => {
  const model = buildControlStation({ player, signals, bodyId: 'all', now: NOW })
  const telescopes = stationTelescopes(model)

  it('has one Space telescope for both orbit feeds and a ground build prompt', () => {
    expect(telescopes.map(t => t.id)).toEqual(['ground', 'space', 'saturn'])
    expect(telescopes[0]).toMatchObject({ built: false, status: 'Not built' })
    expect(telescopes[1]).toMatchObject({ built: true, readyCount: 1, kinds: ['transit', 'deep-space'] })
  })

  it('splits explored, unexplored and all, and only unexplored ones open a tool', () => {
    const open = buildStationSky({ player, signals, view: 'unexplored', telescope: null })
    expect(open.map(a => a.state)).toEqual(['unexplored', 'unexplored'])
    expect(open.every(a => a.signal)).toBe(true)
    const done = buildStationSky({ player, signals, view: 'explored', telescope: null })
    expect(done.map(a => a.detail)).toEqual(['Classified · Likely real', 'Classified · Planet candidate'])
    const all = buildStationSky({ player, signals, view: 'all', telescope: null })
    expect(all.some(a => a.state === 'catalogue' && a.label === 'Saturn')).toBe(true)
    expect(all).toHaveLength(5)
  })

  it('filters to what one telescope finds, with stable positions', () => {
    const saturn = telescopes.find(t => t.id === 'saturn') ?? null
    const only = buildStationSky({ player, signals, view: 'all', telescope: saturn })
    expect(only.map(a => a.kind)).toEqual(['saturn', 'saturn'])
    const again = buildStationSky({ player, signals, view: 'all', telescope: saturn })
    expect(again.map(a => [a.x, a.y])).toEqual(only.map(a => [a.x, a.y]))
  })

  it('keeps a history tally, newest first', () => {
    expect(stationHistory(player)).toMatchObject({ total: 2, recent: [{ label: 'Asteroid 2' }, { label: 'Transit 9' }] })
  })
})
