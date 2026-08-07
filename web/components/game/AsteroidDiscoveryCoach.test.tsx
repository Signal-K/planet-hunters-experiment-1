import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AsteroidDiscoveryCoach from './AsteroidDiscoveryCoach'

describe('AsteroidDiscoveryCoach', () => {
  it('renders the first step with progress dots and a Next control', () => {
    const markup = renderToStaticMarkup(<AsteroidDiscoveryCoach onDismiss={() => undefined} />)
    expect(markup).toContain('data-testid="asteroid-discovery-coach"')
    expect(markup).toContain('A REAL UNCONFIRMED OBJECT FEED')
    expect(markup).toContain('Mission Coach · 1/3')
    expect(markup).toContain('data-testid="asteroid-discovery-coach-next"')
    expect(markup).toContain('data-testid="asteroid-discovery-coach-skip"')
    expect(markup).toContain('Next')
  })
})
