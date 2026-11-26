import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import { isOwnProgramMission } from '@/lib/data'
import { bodiesWithMissions, missionsAtBody, offeredMissions } from './missions-at-body'

const player = () => ({ ...structuredClone(DEFAULT_STATE.player), freeOperations: true, missionsDone: 12 })

describe('missions at a body', () => {
  it('keeps agency and client missions apart', () => {
    const p = player()
    const lit = bodiesWithMissions(STATIC_CATALOG, p)
    expect(lit.size).toBeGreaterThan(0)
    for (const id of lit) {
      const here = missionsAtBody(STATIC_CATALOG, p, id)
      expect(here.agency.every(isOwnProgramMission)).toBe(true)
      expect(here.client.some(isOwnProgramMission)).toBe(false)
      expect(here.agency.length + here.client.length).toBeGreaterThan(0)
    }
  })

  it('offers only the current tutorial step before free operations', () => {
    const p = { ...player(), freeOperations: false, missionsDone: 0 }
    expect(offeredMissions(STATIC_CATALOG, p).every(m => m.sequence === 1)).toBe(true)
  })

  it('lists nothing for a body no mission can reach', () => {
    expect(missionsAtBody(STATIC_CATALOG, player(), 'no-such-body')).toEqual({ agency: [], client: [] })
  })
})
