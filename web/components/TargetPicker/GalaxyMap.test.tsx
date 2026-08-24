import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MISSIONS, TARGETS } from '@/lib/data'
import GalaxyMap from './GalaxyMap'

describe('GalaxyMap', () => {
  it('renders the orbital chart and bodies for the authored M3 mission', () => {
    const mission = MISSIONS.find(item => item.id === 'lnm_m3_relay_bennu_vesta')
    if (!mission) throw new Error('M3 mission fixture is missing')

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
    expect(markup).toContain('viewBox="0 0 640 640"')
    expect(markup).toContain('>SOL</text>')
    expect(markup).toContain('Bennu')
    expect(markup).toContain('min-height:clamp(240px, 45vh, 520px)')
  })
})
