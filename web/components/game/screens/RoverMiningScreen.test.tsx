import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RoverMiningScreen from './RoverMiningScreen'
import { STATIC_CATALOG } from '@/lib/catalog'

const mission = STATIC_CATALOG.missions.find(candidate => candidate.survey?.onWorldVehicle === 'starter-rover')!
const target = STATIC_CATALOG.targets[0]!

describe('RoverMiningScreen scouting', () => {
  it('requires a terrain classification before rover extraction starts', () => {
    const markup = renderToStaticMarkup(
      <RoverMiningScreen mission={mission} target={target} onComplete={() => undefined} onBack={() => undefined} onClassifyTerrain={() => undefined} />,
    )

    expect(markup).toContain('data-testid="rover-scouting-classification"')
    expect(markup).toContain('data-testid="rover-classify-vein"')
    expect(markup).toContain('SURVEY THE SITE')
  })

  it('renders the selected mineral signature as mining intelligence', () => {
    const markup = renderToStaticMarkup(
      <RoverMiningScreen mission={mission} target={target} startedAt={Date.now()} terrainClassification="vein" onComplete={() => undefined} onBack={() => undefined} onClassifyTerrain={() => undefined} />,
    )

    expect(markup).toContain('MINERAL VEIN')
    expect(markup).toContain('SIGNATURE +3')
  })
})
