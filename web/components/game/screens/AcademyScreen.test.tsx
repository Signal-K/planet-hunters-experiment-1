import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AcademyScreen from './AcademyScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { Player } from '@/lib/game-types'

const NOOP = () => undefined
const NOOP1 = () => undefined

function renderAcademy(playerOverrides: Partial<Player>): string {
  const player: Player = { ...DEFAULT_STATE.player, ...playerOverrides }
  return renderToStaticMarkup(
    <AcademyScreen
      player={player}
      catalog={STATIC_CATALOG}
      onBack={NOOP}
      onBuild={NOOP}
      onOpenHangar={NOOP}
      onResearch={NOOP}
      onFunding={NOOP1}
      onHire={NOOP1}
      onRehire={NOOP1}
      onTrain={NOOP1}
      onTrainCandidate={NOOP1}
      onCollectTraining={NOOP1}
      onResearchCrewModule={NOOP}
      onAssign={NOOP1}
      onShareCharts={NOOP1}
    />,
  )
}

describe('AcademyScreen', () => {
  it('shows the pre-build mission card with the affinity/research/build steps when not yet built', () => {
    const markup = renderAcademy({ placed: [], clientMissions: {}, academyResearched: false })
    expect(markup).toContain('data-testid="academy-screen"')
    expect(markup).toContain('Establish the Academy')
    expect(markup).toContain('Earn client trust')
    expect(markup).toContain('Research the Academy')
    expect(markup).toContain('Build at Earth Base')
    expect(markup).not.toContain('data-testid="academy-coach"')
  })

  it('renders the tabbed management view once built, defaulting to the roster tab', () => {
    const markup = renderAcademy({
      placed: ['astronaut-academy'],
      academyResearched: true,
      academyFunded: true,
      clientMissions: { 'helios-propulsion-depot': 10, 'arcturus-battery-systems': 10 },
      crew: [],
    })
    expect(markup).toContain('ACADEMY L')
    expect(markup).toContain('roster')
    expect(markup).toContain('training')
    expect(markup).toContain('hire')
    expect(markup).toContain('staffing')
    expect(markup).toContain('partners')
  })

  // AcademyCoach is gated by a client-only localStorage check (useEffect),
  // which never runs under renderToStaticMarkup — see AcademyCoach.tsx.
  // Its content/behavior is covered directly in AcademyCoach.test.tsx.
})
