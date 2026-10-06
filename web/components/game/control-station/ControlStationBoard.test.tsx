import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildControlStation } from '@/lib/control-station'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import { ControlStationBoard } from './ControlStationBoard'

const signals: InstrumentSignal[] = [
  {
    id: 'toi-1',
    kind: 'transit',
    instrumentId: 'transit-telescope',
    title: 'TOI 1',
    subtitle: 'S/N 8',
    inspectorScreen: 'galaxy',
  },
  {
    id: 'neo-1',
    kind: 'deep-space',
    instrumentId: 'deep-space-telescope',
    title: 'K1',
    subtitle: 'score 80',
    inspectorScreen: 'asteroid-discovery',
  },
]

describe('ControlStationBoard', () => {
  it('shows location filters, project tags, a ready count, and Open', () => {
    const model = buildControlStation({
      player: {
        freeOperations: true,
        transitSatelliteLaunchedAt: 1,
        deepSpaceTelescopeBuilt: true,
      },
      signals,
      bodyId: 'all',
    })
    const markup = renderToStaticMarkup(
      <ControlStationBoard model={model} onBody={() => undefined} onOpen={() => undefined} />,
    )

    expect(markup).toContain('data-testid="control-station-map"')
    expect(markup).toContain('Ground telescopes')
    expect(markup).toContain('Transit Telescope')
    expect(markup).toContain('Deep Space Telescope')
    expect(markup).toContain('Asteroid discovery')
    expect(markup).toContain('Exoplanet Hunters')
    expect(markup).toContain('>Open<')
    expect(markup).toContain('data-testid="instrument-signal-inspect"')
    expect(markup).not.toContain('Gain')
    expect(markup).not.toContain('Scrub')
    expect(markup).not.toContain('>Arm<')
  })
})
