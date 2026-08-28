import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RocketPurchaseScreen from './RocketPurchaseScreen'
import { STATIC_CATALOG } from '@/lib/catalog'

describe('RocketPurchaseScreen', () => {
  it('shows named, comparable vehicle choices after M1', () => {
    const mission = STATIC_CATALOG.missions.find(candidate => candidate.targetId)
    if (!mission) throw new Error('Expected a static mission with a target')

    const markup = renderToStaticMarkup(
      <RocketPurchaseScreen
        missionsDone={1}
        francs={2_000_000_000}
        mission={mission}
        deliveryTargetName={null}
        onPurchase={() => undefined}
        onBack={() => undefined}
      />,
    )

    expect(markup).toContain('mission-setup-screen--rocket theme-deep')
    expect(markup).toContain('data-testid="rocket-choice-explorer"')
    expect(markup).toContain('data-testid="rocket-choice-prospector"')
    expect(markup).toContain('Entry vehicle')
    expect(markup).toContain('Larger vehicle')
    expect(markup).toContain('6U · ORB 5 · DRILL T1')
    expect(markup).toContain('10U · ORB 7 · DRILL T2')
  })
})
