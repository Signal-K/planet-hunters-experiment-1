import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MissionBoardSection from './MissionBoardSection'

describe('MissionBoardSection', () => {
  it('provides the shared title and stacked-content layout', () => {
    const markup = renderToStaticMarkup(<MissionBoardSection title="Future Operations"><div>Coming soon</div></MissionBoardSection>)

    expect(markup).toContain('<section')
    expect(markup).toContain('Future Operations')
    expect(markup).toContain('Coming soon')
    expect(markup).toContain('gap:8px')
  })
})
