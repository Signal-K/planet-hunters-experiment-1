import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FreeOpsBuildCoach from './FreeOpsBuildCoach'

describe('FreeOpsBuildCoach', () => {
  it('renders the first step with progress dots and a Next control', () => {
    const markup = renderToStaticMarkup(<FreeOpsBuildCoach onDismiss={() => undefined} />)
    expect(markup).toContain('data-testid="free-ops-build-coach"')
    expect(markup).toContain('BUILD HAS TWO PATHS')
    expect(markup).toContain('Mission Coach · 1/3')
    expect(markup).toContain('data-testid="free-ops-build-coach-next"')
    expect(markup).toContain('data-testid="free-ops-build-coach-skip"')
    expect(markup).toContain('Next')
  })
})
