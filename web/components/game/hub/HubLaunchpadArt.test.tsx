import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LaunchpadStructure } from './HubLaunchpadArt'

describe('LaunchpadStructure', () => {
  it('uses one grounded Blender render instead of independently positioned pieces', () => {
    const markup = renderToStaticMarkup(
      <LaunchpadStructure w={360} />,
    )

    expect(markup).toContain('/game/assets/hub/pad_complex_v4.png')
    expect(markup).not.toContain('pad_gantry_frame.png')
    expect(markup).toContain('data-launch-state="idle"')
  })

  it('exposes the hot state without changing the grounded art footprint', () => {
    const markup = renderToStaticMarkup(
      <LaunchpadStructure w={360} hot />,
    )

    expect(markup).toContain('data-launch-state="hot"')
    expect(markup.match(/<img/g)).toHaveLength(1)
  })
})
