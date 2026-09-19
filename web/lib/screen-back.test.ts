import { describe, expect, it } from 'vitest'

import type { Screen } from '@/lib/game-types'
import { LOGICAL_BACK, resolveLogicalBack, type HostScene } from '@/lib/screen-back'

const EVERY_SCREEN = Object.keys(LOGICAL_BACK) as Screen[]

function walkToHub(start: Screen, hangarReturn: HostScene = 'hub', lastHost: HostScene = 'hub'): Screen[] {
  const path: Screen[] = []
  let current = start
  for (let i = 0; i < 8; i++) {
    const next = resolveLogicalBack({
      current,
      fallback: 'hub',
      lastHost,
      hangarReturn,
    })
    path.push(next)
    if (next === 'hub' || next === current) break
    current = next
  }
  return path
}

describe('logical scene back', () => {
  it('defines a parent for every screen', () => {
    expect(EVERY_SCREEN.length).toBeGreaterThan(10)
    for (const screen of EVERY_SCREEN) {
      expect(LOGICAL_BACK[screen]).toBeTruthy()
    }
  })

  it('never cycles: every scene reaches Hub in a few steps', () => {
    for (const screen of EVERY_SCREEN) {
      const path = walkToHub(screen, screen === 'hangar' ? 'launchpad' : 'hub', 'hub')
      expect(path.at(-1), `${screen} → ${path.join(' → ')}`).toBe('hub')
      expect(new Set(path).size, `${screen} repeated ${path.join(' → ')}`).toBe(path.length)
    }
  })

  it('Launchpad always returns to Hub, never Hangar', () => {
    expect(resolveLogicalBack({
      current: 'launchpad',
      fallback: 'hub',
      lastHost: 'launchpad',
      hangarReturn: 'launchpad',
    })).toBe('hub')
  })

  it('Hangar returns to the host it was opened from', () => {
    expect(resolveLogicalBack({
      current: 'hangar',
      fallback: 'hub',
      lastHost: 'launchpad',
      hangarReturn: 'launchpad',
    })).toBe('launchpad')
    expect(resolveLogicalBack({
      current: 'hangar',
      fallback: 'hub',
      lastHost: 'hub',
      hangarReturn: 'hub',
    })).toBe('hub')
  })

  it('mission setup walks Rocket → Targets → Missions, then the host', () => {
    expect(resolveLogicalBack({
      current: 'rocket-buy',
      fallback: 'hub',
      lastHost: 'launchpad',
      hangarReturn: 'hub',
    })).toBe('targets')
    expect(resolveLogicalBack({
      current: 'targets',
      fallback: 'hub',
      lastHost: 'launchpad',
      hangarReturn: 'hub',
    })).toBe('missions')
    expect(resolveLogicalBack({
      current: 'missions',
      fallback: 'hub',
      lastHost: 'launchpad',
      hangarReturn: 'hub',
    })).toBe('launchpad')
    expect(resolveLogicalBack({
      current: 'missions',
      fallback: 'hub',
      lastHost: 'hub',
      hangarReturn: 'hub',
    })).toBe('hub')
  })

  it('assembly fallback stays on the rocket step', () => {
    expect(resolveLogicalBack({
      current: 'fab',
      fallback: 'rocket-buy',
      lastHost: 'launchpad',
      hangarReturn: 'hub',
    })).toBe('rocket-buy')
  })
})
