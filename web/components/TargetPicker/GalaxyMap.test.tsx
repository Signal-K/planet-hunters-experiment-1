import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MISSIONS, TARGETS } from '@/lib/data'
import GalaxyMap from './GalaxyMap'

describe('GalaxyMap', () => {
  it('renders the orbital chart and bodies for an authored relay mission', () => {
    const mission = MISSIONS.find(item => item.id === 'lnm_relay_psyche_ceres')
    if (!mission) throw new Error('relay mission fixture is missing')

    const markup = renderToStaticMarkup(
      <GalaxyMap
        mission={mission}
        targets={TARGETS.filter(target => target.orbit !== undefined)}
        compatibleIds={new Set(['bennu', 'vesta', 'eros', 'itokawa'])}
        pickedId="bennu"
        onPick={() => undefined}
      />,
    )

    expect(markup).toContain('data-testid="target-picker-orbital-map"')
    expect(markup).toContain('data-testid="target-bennu"')
    expect(markup).toContain('viewBox="72 72 496 496"')
    expect(markup).toContain('>SUN</text>')
    expect(markup).toContain('Solar system · target range')
    expect(markup).toContain('Bennu')
    expect(markup).toContain('min-height:clamp(240px, 45vh, 520px)')
  })
})
