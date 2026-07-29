import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MissionBoardCompleteState from './MissionBoardCompleteState'

describe('MissionBoardCompleteState', () => {
  it('renders the onboarding completion handoff', () => {
    const markup = renderToStaticMarkup(<MissionBoardCompleteState onBack={() => undefined} />)

    expect(markup).toContain('Training Arc Complete')
    expect(markup).toContain('Three Operations Down')
    expect(markup).toContain('Open Free Ops from the mission board')
    expect(markup).toContain('data-ui-zone="screen-content"')
  })
})
