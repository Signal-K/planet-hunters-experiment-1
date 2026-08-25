import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MiningScreen from './MiningScreen'
import { MINERAL_META } from '@/lib/data'
import { STATIC_CATALOG } from '@/lib/catalog'

const mission = STATIC_CATALOG.missions.find(candidate => candidate.requires.minerals && Object.keys(candidate.requires.minerals).length > 0)!
const target = STATIC_CATALOG.targets[0]!

describe('MiningScreen light HUD pass', () => {
  it('keeps the mining field dark while opting the HUD into the blueprint surface', () => {
    const markup = renderToStaticMarkup(
      <MiningScreen
        mission={mission}
        target={target}
        minerals={MINERAL_META}
        onComplete={() => undefined}
        onBack={() => undefined}
      />,
    )

    expect(markup).toContain('class="game-screen mining-screen theme-blueprint"')
    expect(markup).toContain('class="mining-controls"')
    expect(markup).toContain('data-testid="mining-canvas"')
    expect(markup).toContain('class="mining-guide-button"')
  })
})
