import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildControlStation } from '@/lib/control-station'
import { wswBanner } from '@/lib/wsw'
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

const NOW = Date.UTC(2026, 9, 10, 12)

describe('ControlStationBoard', () => {
  it('shows location filters, project tags, a ready count, and Open', () => {
    const model = buildControlStation({
      player: {
        freeOperations: true,
        placed: ['ground-telescope'],
        transitSatelliteLaunchedAt: 1,
        deepSpaceTelescopeBuilt: true,
      },
      signals,
      bodyId: 'all',
      now: NOW,
    })
    const markup = renderToStaticMarkup(
      <ControlStationBoard model={model} onBody={() => undefined} onOpen={() => undefined} onBuild={() => undefined} banner={wswBanner(undefined, NOW)} />,
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

  it('shows a build prompt, not a standing row, when no ground telescope is built', () => {
    const model = buildControlStation({ player: { freeOperations: true }, signals: [], bodyId: 'all', now: NOW })
    const markup = renderToStaticMarkup(
      <ControlStationBoard model={model} onBody={() => undefined} onOpen={() => undefined} onBuild={() => undefined} banner={wswBanner(undefined, NOW)} />,
    )

    expect(markup).toContain('Ground telescopes')
    expect(markup).toContain('None built')
    expect(markup).toContain('data-testid="control-station-build"')
    expect(markup).toContain('>Build<')
    expect(markup).not.toContain('Standing by')
    expect(markup).not.toContain('data-testid="control-station-marker"')
  })

  it('flags World Space Week with a banner and one chip per sky-event badge', () => {
    const model = buildControlStation({ player: { freeOperations: true }, signals: [], bodyId: 'all', now: NOW })
    const markup = renderToStaticMarkup(
      <ControlStationBoard model={model} onBody={() => undefined} onOpen={() => undefined} onBuild={() => undefined} banner={wswBanner(undefined, NOW)} />,
    )

    expect(markup).toContain('data-testid="wsw-banner"')
    expect(markup).toContain('World Space Week 4-10 OCT')
    expect(markup.match(/data-testid="wsw-chip"/g)).toHaveLength(4)
  })
})
