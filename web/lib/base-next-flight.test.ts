import { describe, expect, it } from 'vitest'
import { MISSIONS, TARGETS } from './data'
import { baseNextFlight, nextMiningContract } from './base-next-flight'
import { resolvePreset } from './devPresets'

const player = resolvePreset('hub-first-run')!.player!
const mission = MISSIONS.find(m => m.client && !m.payload && !m.deliveryTargetId && Object.values(m.requires.minerals).some(n => n > 0))!
const target = TARGETS.find(t => t.id === mission.targetId) ?? TARGETS[0]
const next = { mission, target }
const option = { mission, targetIds: [target.id], unlocked: true }

describe('Base next flight', () => {
  it('offers only eligible, reachable, single-stop mining work, shortest order first', () => {
    const short = { ...mission, id: 'short', targetId: target.id, requires: { ...mission.requires, minerals: { iron: 2 } } }
    const options = [
      { ...option, mission: { ...short, id: 'locked' }, unlocked: false },
      { ...option, mission: { ...short, id: 'unreachable' }, targetIds: [] },
      { ...option, mission: { ...short, id: 'relay', deliveryTargetId: 'mars' } },
      { ...option, mission: { ...short, id: 'long', requires: { ...short.requires, minerals: { iron: 12 } } } },
      { ...option, mission: short },
    ]
    expect(nextMiningContract(options, TARGETS)?.mission.id).toBe('short')
    expect(options[0].mission.id).toBe('locked')
    expect(nextMiningContract(options.slice(0, 3), TARGETS)).toBeNull()
  })

  it('resumes an active run before offering setup or another job, including an elapsed return', () => {
    const active = { ...player, activeMission: { id: mission.id, label: mission.title }, missionPhase: 'mining' as const }
    expect(baseNextFlight(active, mission, target, next).screen).toBe('mining')
    const arrived = baseNextFlight({ ...active, missionPhase: 'transit', arrivalAt: 1, returningToEarth: true }, mission, target, next, 2)
    expect(arrived.screen).toBe('debrief')
    expect(arrived.prepare).toBeUndefined()
  })

  it('preserves an unfinished setup or prepared rocket instead of replacing it', () => {
    expect(baseNextFlight(player, mission, target, next).screen).toBe('fab')
    expect(baseNextFlight({ ...player, pendingLaunch: true }, null, null, next).screen).toBe('launchpad')
  })

  it('directs missing and worn pads to the required work before setup', () => {
    expect(baseNextFlight({ ...player, placed: [] }, null, null, next).screen).toBe('hub')
    expect(baseNextFlight({ ...player, padLaunches: 10 }, mission, target, next).cta).toBe('Service pad')
  })

  it('prepares the eligible job without changing player resources, with a board fallback', () => {
    const before = structuredClone(player)
    expect(baseNextFlight(player, null, null, next).prepare).toEqual({ missionId: mission.id, targetId: target.id })
    expect(baseNextFlight(player, null, null, null).prepare).toBeUndefined()
    expect(player).toEqual(before)
  })
})
