import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import MissionSceneBackdrop from './MissionSceneBackdrop'

describe('MissionSceneBackdrop', () => {
  it('owns the terrain and both Earth Base structures for every setup step', () => {
    const markup = renderToStaticMarkup(<MissionSceneBackdrop composition="earth-base-pad" />)

    expect(markup).toContain('data-testid="mission-setup-background"')
    expect(markup).toContain('data-testid="mission-setup-launchpad-structure"')
    expect(markup).toContain('data-testid="mission-setup-hangar-structure"')
    expect(markup).toContain('/game/assets/base/launchpad_flat.png')
    expect(markup).toContain('/game/assets/base/hangar_flat.png')
  })
})
