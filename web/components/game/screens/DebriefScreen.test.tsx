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
})
