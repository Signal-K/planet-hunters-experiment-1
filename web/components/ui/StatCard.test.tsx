import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Boxes } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import StatCard from './StatCard'

describe('StatCard', () => {
  it('renders compact icon telemetry for preflight', () => {
    const markup = renderToStaticMarkup(
      <StatCard variant="compact" icon={<Boxes size={15} />} label="Cargo Bay" value="6 units" />,
    )

    expect(markup).toContain('Cargo Bay')
    expect(markup).toContain('6 units')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('renders detailed telemetry for rocket selection', () => {
    const markup = renderToStaticMarkup(
      <StatCard label="Max Orbit" value="ORB 3" detail="Near-Earth" />,
    )

    expect(markup).toContain('Max Orbit')
    expect(markup).toContain('ORB 3')
    expect(markup).toContain('Near-Earth')
  })
})
