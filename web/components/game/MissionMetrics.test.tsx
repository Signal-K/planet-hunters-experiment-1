import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MissionMetrics from './MissionMetrics'
import { CONTRACTORS, MISSIONS, MINERAL_META } from '@/lib/data'

describe('MissionMetrics', () => {
  it('renders cargo, payout, and affinity metrics from mission data', () => {
    const mission = MISSIONS[0]
    const contractor = CONTRACTORS[0]
    const markup = renderToStaticMarkup(<MissionMetrics mission={mission} contractor={contractor} mineralMeta={MINERAL_META} />)

    expect(markup).toContain('Cargo')
    expect(markup).toContain('Payout bonus')
    expect(markup).toContain('Affinity')
  })
})
