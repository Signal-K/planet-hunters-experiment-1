import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Boxes } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import RocketStatCard from './RocketStatCard'

describe('RocketStatCard', () => {
  it('renders compact icon telemetry for preflight', () => {
    const markup = renderToStaticMarkup(
      <RocketStatCard variant="compact" icon={<Boxes size={15} />} label="Cargo Bay" value="6 units" />,
    )

    expect(markup).toContain('Cargo Bay')
    expect(markup).toContain('6 units')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('renders detailed telemetry for rocket selection', () => {
    const markup = renderToStaticMarkup(
      <RocketStatCard label="Max Orbit" value="ORB 3" detail="Near-Earth" />,
    )

    expect(markup).toContain('Max Orbit')
    expect(markup).toContain('ORB 3')
    expect(markup).toContain('Near-Earth')
  })
})
