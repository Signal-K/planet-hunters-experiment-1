import { describe, expect, it } from 'vitest'
import { buildControlStation } from '@/lib/control-station'
import { stationSummary } from '@/lib/page-info'

describe('stationSummary', () => {
  it('counts nothing before Free Ops opens the station', () => {
    const model = buildControlStation({ player: {}, signals: [], bodyId: 'all' })
    expect(stationSummary(model)).toEqual({ instruments: 0, live: 0, ready: 0, projects: 0 })
  })

  it('rolls up listed instruments, live feeds, ready frames and distinct projects', () => {
    const model = buildControlStation({
      player: { freeOperations: true, transitSatelliteLaunchedAt: 1, deepSpaceTelescopeBuilt: true },
      signals: [
        { id: 'toi-1', kind: 'transit', instrumentId: 'transit-telescope', title: 'TOI 1', subtitle: '', inspectorScreen: 'galaxy' },
      ],
      bodyId: 'all',
    })
    const summary = stationSummary(model)
    expect(summary.instruments).toBeGreaterThanOrEqual(3)
    expect(summary.ready).toBe(1)
    expect(summary.live).toBeGreaterThanOrEqual(1)
    expect(summary.projects).toBeGreaterThanOrEqual(2)
  })
})
