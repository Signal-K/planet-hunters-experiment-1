// @vitest-environment jsdom
// pixi.js reads `navigator` at import time. Node 21+ has a global navigator so
// this passes on a modern local Node, but CI runs Node 20 where it does not
// exist — the file then dies with "navigator is not defined" before a single
// test runs. jsdom supplies it either way.
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TransitScreen from './TransitScreen'
import type { Client, MineralMeta, Mission, Target } from '@/lib/data'

// Static markup only — the PixiJS backdrop and clock ticks live in effects,
// which never run under renderToStaticMarkup, so no WebGL stubbing is needed
// (same approach as MissionSetupShell.test.tsx).

const target: Target = {
  id: 'vesta', name: '4 Vesta', type: 'asteroid', orbit: 4, difficulty: 'L1', brief: '', minerals: ['iron'],
}

const mission: Mission = {
  id: 'lnm_m3_relay_bennu_vesta',
  title: 'Belt Courier Run',
  brief: '',
  client: 'atlas-aggregate',
  tag: 'TRANSPORT',
  difficulty: 'L1',
  locked: false,
  sequence: 3,
  targetId: 'bennu',
  deliveryTargetId: 'vesta',
  requires: { minerals: { iron: 3 }, cargo_min: 3, drill_tier: 1, max_orbit: 4 },
  payout: { francs: 1, affinity: 0 },
}

const client: Client = {
  id: 'atlas-aggregate', name: 'Atlas Aggregate', color: '#87CFFA', initial: 'AA',
  unlockTier: 1, projectType: 'Off-world construction', mineralPreferences: ['iron'],
  payoutPremium: 0.18, affinityBonusPerMission: 0.02, uiRole: 'bulk', suppliesCrew: false,
}

const iron = { name: 'Iron', sym: 'Fe', price: 10, color: '#c9c9c9', laserAccess: 1 } as unknown as MineralMeta

const noop = () => {}

function renderTransit(props: Partial<React.ComponentProps<typeof TransitScreen>> = {}) {
  return renderToStaticMarkup(
    <TransitScreen
      target={target}
      arrivalAt={Date.now() + 60_000}
      transitStartedAt={Date.now()}
      mission={mission}
      client={client}
      onArrive={noop}
      onBack={noop}
      {...props}
    />,
  )
}

describe('TransitScreen mission context (STS-546)', () => {
  it('names the mission and who it is for during the flight', () => {
    const markup = renderTransit()
    expect(markup).toContain('data-testid="transit-mission-context"')
    expect(markup).toContain('Belt Courier Run')
    expect(markup).toContain('For Atlas Aggregate')
  })

  it('credits the player, not a client, on an own-program run', () => {
    const markup = renderTransit({
      mission: {
        ...mission,
        id: 'story-transit-telescope-launch',
        title: 'Launch Transit Telescope',
        client: undefined,
        deliveryTargetId: undefined,
        payload: { type: 'satellite', name: 'Transit Telescope', cargoCost: 0 },
        payout: { francs: 0, affinity: 0 },
        programReward: {
          researchXP: 0,
          outcome: 'Transit telescope online · daily instrument feed unlocked',
        },
      },
      client: null,
    })
    expect(markup).toContain('Your program')
    expect(markup).not.toContain('Mission Control')
  })

  it('shows the manifest on the Earth-return leg, not only on delivery', () => {
    const markup = renderTransit({ returning: true, cargo: { iron: 3 }, minerals: { iron } })
    expect(markup).toContain('Hauling home to Earth')
    expect(markup).toContain('3 Iron')
  })

  it('keeps the delivery-leg manifest wording', () => {
    const markup = renderTransit({ isDelivery: true, cargo: { iron: 3 }, minerals: { iron } })
    expect(markup).toContain('Delivering to 4 Vesta')
  })

  it('renders nothing extra when no mission context is supplied', () => {
    const markup = renderTransit({ mission: null, client: null })
    expect(markup).not.toContain('data-testid="transit-mission-context"')
  })
})
