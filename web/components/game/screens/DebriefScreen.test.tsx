// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import DebriefScreen from './DebriefScreen'
import type { Mission, Target } from '@/lib/data'

const target: Target = {
  id: 'earth-orbit-transit-telescope',
  name: 'Earth Orbit',
  type: 'planet',
  orbit: 1,
  difficulty: 'L1',
  brief: '',
  minerals: [],
}

const programMission: Mission = {
  id: 'story-transit-telescope-launch',
  title: 'Launch Transit Telescope',
  brief: '',
  tag: 'STORY',
  difficulty: 'L1',
  locked: false,
  sequence: 4,
  targetId: target.id,
  requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 1 },
  payout: { francs: 0, affinity: 0 },
  payload: { type: 'satellite', name: 'Transit Telescope', cargoCost: 0 },
  programReward: {
    researchXP: 0,
    outcome: 'Transit telescope online · daily instrument feed unlocked',
  },
}

const clientMission: Mission = {
  id: 'client-test-run',
  title: 'Ore Delivery',
  brief: '',
  client: 'test-client',
  tag: 'CONTRACT',
  difficulty: 'L1',
  locked: false,
  sequence: 1,
  targetId: target.id,
  requires: { minerals: { iron: 1 }, cargo_min: 1, drill_tier: 1, max_orbit: 1 },
  payout: { francs: 1000, affinity: 0 },
}

const testClient = {
  id: 'test-client',
  name: 'Test Client',
  color: 'var(--ln-cyan)',
  initial: 'T',
  unlockTier: 0,
  projectType: 'ore',
  mineralPreferences: [],
  payoutPremium: 0,
  affinityBonusPerMission: 0,
  uiRole: 'starter' as const,
  suppliesCrew: false,
}

const freeMiningMission: Mission = {
  id: 'self-directed-test-run',
  title: 'Self-Directed Mining Run',
  brief: '',
  tag: 'FREE OPS',
  difficulty: 'L2',
  locked: false,
  sequence: 4,
  targetId: target.id,
  requires: { minerals: { iron: 1 }, cargo_min: 1, drill_tier: 1, max_orbit: 2 },
  payout: { francs: 0, affinity: 0 },
}

describe('DebriefScreen own-program outcomes', () => {
  it('resolves a program flight as an outcome instead of a client payout', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const onDone = vi.fn()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(
        <DebriefScreen
          mission={programMission}
          target={target}
          cargo={{}}
          onDone={onDone}
          minerals={{}}
          clients={{}}
          freeOperations
          missionsDone={4}
          rocket={{ chassis: 'hull-mk2' }}
          loanDebt={2_000_000}
        />,
      )
    })

    expect(host.textContent).not.toContain('Client')
    expect(host.textContent).not.toContain('Collect ₣')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="resolve-cargo-btn"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.textContent).toContain('Program Outcome')
    expect(host.textContent).toContain('daily instrument feed unlocked')
    expect(host.textContent).toContain('+0 XP')
    expect(host.textContent).toContain('Log Program Outcome')
    expect(host.textContent).not.toContain('Loan repayment')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="collect-reward-btn"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onDone).toHaveBeenCalledWith(0, 0, {})

    await act(async () => {
      root.unmount()
    })
  })

  it('offers sell-only settlement when no Mineral Vault exists', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const onDone = vi.fn()

    await act(async () => {
      root.render(
        <DebriefScreen
          mission={freeMiningMission}
          target={target}
          cargo={{ iron: 2 }}
          onDone={onDone}
          minerals={{}}
          clients={{}}
          hasEarthStorage={false}
          haulMarketValue={640}
        />,
      )
    })

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="resolve-cargo-btn"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.textContent).toContain('Your ore · keep or sell')
    expect(host.textContent).toContain('Needs a Vault')
    expect(host.textContent).toContain('Build a Mineral Vault')
    expect(host.textContent).toContain('Sell haul')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="collect-reward-btn"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onDone).toHaveBeenCalledWith(0, 0, {}, 'sell')
    root.unmount()
  })

  it('lets a Vault owner switch a free haul from keeping to selling', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const onDone = vi.fn()

    await act(async () => {
      root.render(
        <DebriefScreen
          mission={freeMiningMission}
          target={target}
          cargo={{ iron: 2 }}
          onDone={onDone}
          minerals={{}}
          clients={{}}
          hasEarthStorage
          storageCapacity={120}
          storageUsed={2}
          haulMarketValue={640}
        />,
      )
    })

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="resolve-cargo-btn"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host.textContent).toContain('Keep haul on Earth')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="debrief-sell"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host.textContent).toContain('Sell haul')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="collect-reward-btn"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onDone).toHaveBeenCalledWith(0, 0, {}, 'sell')
    root.unmount()
  })

  it('KES-282: collapses the two-tap resolve/collect ritual to one tap on an early onboarding mission', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const onDone = vi.fn()

    await act(async () => {
      root.render(
        <DebriefScreen
          mission={clientMission}
          target={target}
          cargo={{ iron: 1 }}
          onDone={onDone}
          minerals={{}}
          clients={{ 'test-client': testClient }}
          missionsDone={2}
          rocket={{ chassis: 'hull-mk2' }}
        />,
      )
    })

    // The reveal/ledger is already showing on mount — no "Resolve Cargo" tap
    // required — and the single visible action collects the payout.
    expect(host.querySelector('[data-testid="resolve-cargo-btn"]')).toBeNull()
    expect(host.textContent).toContain('Ledger')
    const collectBtn = host.querySelector<HTMLButtonElement>('[data-testid="collect-reward-btn"]')
    expect(collectBtn).not.toBeNull()

    await act(async () => {
      collectBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onDone).toHaveBeenCalledWith(1000, 0, { iron: 1 })
    root.unmount()
  })

  it('KES-282: keeps the two-tap ritual for later (post-onboarding) missions', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const onDone = vi.fn()

    await act(async () => {
      root.render(
        <DebriefScreen
          mission={clientMission}
          target={target}
          cargo={{ iron: 1 }}
          onDone={onDone}
          minerals={{}}
          clients={{ 'test-client': testClient }}
          missionsDone={5}
          rocket={{ chassis: 'hull-mk2' }}
        />,
      )
    })

    expect(host.querySelector('[data-testid="resolve-cargo-btn"]')).not.toBeNull()
    expect(host.textContent).not.toContain('Ledger')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="resolve-cargo-btn"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host.textContent).toContain('Ledger')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="collect-reward-btn"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onDone).toHaveBeenCalledWith(1000, 0, { iron: 1 })
    root.unmount()
  })
})
