import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LaunchpadStructure } from './HubLaunchpadArt'

describe('LaunchpadStructure', () => {
  it('keeps the authored launchpad composite intact in the DOM fallback', () => {
    const markup = renderToStaticMarkup(
      <LaunchpadStructure w={360} />,
    )

    for (const asset of [
      'pad_mast.png',
      'pad_tank.png',
      'pad_gantry_frame.png',
      'pad_deck.png',
      'pad_clamp.png',
      'pad_swing_arm.png',
    ]) {
      expect(markup).toContain(`/game/assets/hub/${asset}`)
    }
  })

  it('preserves the hot launchpad state without changing its reachable DOM footprint', () => {
    const markup = renderToStaticMarkup(
      <LaunchpadStructure w={360} hot />,
    )

    expect(markup).toContain('rotate(-63.0253574643905deg)')
    expect(markup.match(/pad_/g)?.length).toBeGreaterThanOrEqual(9)
  })
})
