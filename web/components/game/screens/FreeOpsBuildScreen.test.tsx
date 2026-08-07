import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FreeOpsBuildScreen from './FreeOpsBuildScreen'

const NOOP = () => undefined

describe('FreeOpsBuildScreen', () => {
  it('renders both the own-operation and client-work paths', () => {
    const markup = renderToStaticMarkup(
      <FreeOpsBuildScreen onBack={NOOP} onMissions={NOOP} onInfrastructure={NOOP} />,
    )
    expect(markup).toContain('data-testid="free-ops-build-screen"')
    expect(markup).toContain('Your own operation')
    expect(markup).toContain('Client work')
    expect(markup).toContain('Build Infrastructure')
    expect(markup).toContain('Choose Mining')
    expect(markup).toContain('Browse Client Missions')
  })

  // FreeOpsBuildCoach is gated by a client-only localStorage check (useEffect),
  // which never runs under renderToStaticMarkup — see FreeOpsBuildCoach.tsx.
  // Its content/behavior is covered directly in FreeOpsBuildCoach.test.tsx.
  it('does not render the coach under SSR (no localStorage effect)', () => {
    const markup = renderToStaticMarkup(
      <FreeOpsBuildScreen onBack={NOOP} onMissions={NOOP} onInfrastructure={NOOP} />,
    )
    expect(markup).not.toContain('data-testid="free-ops-build-coach"')
  })
})
