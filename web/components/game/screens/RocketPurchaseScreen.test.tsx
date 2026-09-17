import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import RocketPurchaseScreen from './RocketPurchaseScreen'
import { MISSIONS } from '@/lib/data'
import type { Mission } from '@/lib/data'

const telescope: Mission = {
  id: 'story-transit-telescope-launch',
  title: 'Launch Transit Telescope',
  brief: 'Deploy your own TESS-class telescope into Earth orbit.',
  tag: 'STORY',
  difficulty: 'L1',
  locked: false,
  sequence: 4,
  payload: { type: 'satellite', name: 'Transit Telescope', cargoCost: 0 },
  requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 1 },
  payout: { francs: 0, affinity: 0 },
}

const noop = vi.fn()
const screenProps = {
  francs: 30_000_000,
  onPurchase: noop,
  onFabricatePart: noop,
  onAssembleFabricatedRocket: noop,
  siloOnline: false,
  stash: {},
  fabricatedParts: {},
  onBack: noop,
}

function renderRocketScreen(mission: Mission, missionsDone: number) {
  return renderToStaticMarkup(
    <RocketPurchaseScreen
      {...screenProps}
      missionsDone={missionsDone}
      mission={mission}
    />,
  )
}

describe('RocketPurchaseScreen job fit', () => {
  it('defaults the telescope launch to Explorer and shows payload plus compatibility', () => {
    const markup = renderRocketScreen(telescope, 3)

    expect(markup).toContain('data-testid="rocket-choice-explorer"')
    expect(markup).toMatch(/<button[^>]*aria-checked="true"[^>]*data-testid="rocket-choice-explorer"/)
    expect(markup).toContain('Launch Transit Telescope')
    expect(markup).toContain('Transit Telescope')
    expect(markup).toContain('data-testid="rocket-mission-fit"')
    expect(markup).toContain('data-testid="rocket-fit-cargo"')
    expect(markup).toContain('Fits this job')
    expect(markup).toContain('Continue with Explorer')
    expect(markup).toContain('Vehicle specs')
    expect(markup).not.toContain('open="">')
    expect(markup).not.toContain('Vehicle systems staged')
    expect(markup).not.toContain('Each launch uses one vehicle')
  })

  it('defaults M2 Heavy Haul to Prospector and marks Explorer incompatible', () => {
    const heavyHaul = MISSIONS.find(mission => mission.sequence === 2)
    expect(heavyHaul).toBeTruthy()
    const markup = renderRocketScreen(heavyHaul!, 1)

    expect(markup).toMatch(/<button[^>]*aria-checked="true"[^>]*data-testid="rocket-choice-prospector"/)
    expect(markup).toContain('Cannot fly this job')
    expect(markup).toContain('Purchase')
  })
})
