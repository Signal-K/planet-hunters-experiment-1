// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MINERAL_META, MISSIONS, TARGETS } from '@/lib/data'
import MiningScreen from './MiningScreen'

describe('MiningScreen guide', () => {
  let values: Record<string, string> = {}

  beforeEach(() => {
    values = {}
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values[key] ?? null,
        setItem: (key: string, value: string) => { values[key] = value },
        clear: () => { values = {} },
      },
    })
  })

  afterEach(() => { values = {} })

  it('does not auto-open controls during the Fire Laser training try, but keeps help available on demand', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(
        <MiningScreen
          mission={MISSIONS[0]}
          target={TARGETS[0]}
          minerals={MINERAL_META}
          trainingMiningTry
          onComplete={() => undefined}
          onBack={() => undefined}
        />,
      )
    })

    expect(host.querySelector('.mining-guide-dock')).toBeNull()
    expect(values.ln_mining_hud_guide_ack).toBeUndefined()

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="mining-guide-btn"]')?.click()
    })
    expect(host.querySelector('.mining-guide-dock')).not.toBeNull()

    await act(async () => root.unmount())
  })
})
