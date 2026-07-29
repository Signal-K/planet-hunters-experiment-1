import { describe, it, expect } from 'vitest'
import {
  applyAddCrewMember,
  applyRemoveCrewMember,
  applySetCrewCondition,
  createCrewMember,
  crewLevel,
  migrateCrewRoster,
  pickCrewName,
  roverCrewId,
  settleCrewConditions,
  STARTING_CREW,
  xpForCrewLevel,
} from './CrewSystem'
import { DEFAULT_STATE, normalizeState } from '@/lib/game-state'
import type { GameState, Player } from '@/lib/game-types'
import type { CrewMember } from '@/lib/data'
import { HIRED_CREW_LEVEL, TRAINED_CREW_LEVEL } from '@/lib/data'

const NOW = 1_785_000_000_000

function stateWithCrew(crew: CrewMember[]): GameState {
  return { ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, crew } }
}

describe('createCrewMember', () => {
  it('starts a self-trained astronaut at level 1, fit, with no XP', () => {
    const c = createCrewMember({ id: 'crew-1', crewClass: 'astronaut', selfTrained: true, now: NOW })
    expect(c).toMatchObject({
      id: 'crew-1', crewClass: 'astronaut',
      xp: 0, condition: 'fit', selfTrained: true, joinedAt: NOW,
    })
    expect(c.specialisations).toEqual([])
    expect(c.recoveredAt).toBeUndefined()
  })

  it('starts a hire at level 3 and records what it cost', () => {
    const c = createCrewMember({ id: 'crew-2', crewClass: 'astronaut', selfTrained: false, hireCost: 1_500_000, now: NOW })
    expect(crewLevel(c)).toBe(HIRED_CREW_LEVEL)
    expect(c.xp).toBe(xpForCrewLevel(HIRED_CREW_LEVEL))
    expect(c.hireCost).toBe(1_500_000)
  })

  it('omits hireCost entirely for crew that cost nothing to acquire', () => {
    const c = createCrewMember({ id: 'crew-3', crewClass: 'astronaut', selfTrained: true, now: NOW })
    expect('hireCost' in c).toBe(false)
  })

  it('gives rovers and drones a designation, not a person name', () => {
    const rover = createCrewMember({ id: 'crew-r', crewClass: 'rover', selfTrained: true, now: NOW })
    const drone = createCrewMember({ id: 'crew-d', crewClass: 'drone', selfTrained: true, now: NOW })
    expect(rover.name).toBe('Rover 01')
    expect(drone.name).toBe('Drone 01')
  })
})

describe('pickCrewName', () => {
  it('is stable for a given id, so a roster does not reshuffle on reload', () => {
    expect(pickCrewName('crew-abc', 'astronaut')).toBe(pickCrewName('crew-abc', 'astronaut'))
  })

  it('avoids a name already on the roster', () => {
    const first = pickCrewName('crew-abc', 'astronaut')
    const taken = [{ ...createCrewMember({ id: 'x', crewClass: 'astronaut', selfTrained: true, now: NOW }), name: first }]
    expect(pickCrewName('crew-abc', 'astronaut', taken)).not.toBe(first)
  })

  it('numbers rover designations off the existing rovers only', () => {
    const roster = [
      createCrewMember({ id: 'r1', crewClass: 'rover', selfTrained: true, now: NOW }),
      createCrewMember({ id: 'a1', crewClass: 'astronaut', selfTrained: true, now: NOW }),
    ]
    expect(pickCrewName('r2', 'rover', roster)).toBe('Rover 02')
  })
})

describe('roster mutation', () => {
  it('adds a crew member', () => {
    const c = createCrewMember({ id: 'crew-1', crewClass: 'astronaut', selfTrained: true, now: NOW })
    expect(applyAddCrewMember(DEFAULT_STATE, c).player.crew).toEqual([c])
  })

  it('will not add the same id twice', () => {
    const c = createCrewMember({ id: 'crew-1', crewClass: 'astronaut', selfTrained: true, now: NOW })
    const once = applyAddCrewMember(DEFAULT_STATE, c)
    expect(applyAddCrewMember(once, c)).toBe(once)
  })

  it('removes a crew member who quit', () => {
    const c = createCrewMember({ id: 'crew-1', crewClass: 'astronaut', selfTrained: true, now: NOW })
    expect(applyRemoveCrewMember(stateWithCrew([c]), 'crew-1').player.crew).toEqual([])
  })

  it('ignores a remove for an id that is not on the roster', () => {
    const s = stateWithCrew([])
    expect(applyRemoveCrewMember(s, 'nobody')).toBe(s)
  })
})

describe('condition', () => {
  const base = createCrewMember({ id: 'crew-1', crewClass: 'astronaut', selfTrained: true, now: NOW })

  it('sets a condition with its recovery time', () => {
    const s = applySetCrewCondition(stateWithCrew([base]), 'crew-1', 'injured', NOW + 86_400_000)
    expect(s.player.crew?.[0]).toMatchObject({ condition: 'injured', recoveredAt: NOW + 86_400_000 })
  })

  it('clears the recovery time when set back to fit', () => {
    const injured = applySetCrewCondition(stateWithCrew([base]), 'crew-1', 'injured', NOW + 1000)
    const healed = applySetCrewCondition(injured, 'crew-1', 'fit')
    expect(healed.player.crew?.[0].condition).toBe('fit')
    expect('recoveredAt' in (healed.player.crew?.[0] ?? {})).toBe(false)
  })

  it('settles a lapsed condition lazily rather than ticking', () => {
    const injured: CrewMember = { ...base, condition: 'injured', recoveredAt: NOW }
    expect(settleCrewConditions([injured], NOW + 1)[0]).toMatchObject({ condition: 'fit' })
  })

  it('leaves a condition that has not lapsed alone', () => {
    const injured: CrewMember = { ...base, condition: 'injured', recoveredAt: NOW + 5000 }
    expect(settleCrewConditions([injured], NOW)[0].condition).toBe('injured')
  })
})

describe('migrateCrewRoster', () => {
  it('grants the starting crew to a crew-less save', () => {
    // One astronaut, one drone, one rover — Q02/Q05/Q24 of the academy question set.
    const crew = migrateCrewRoster({}, NOW)
    expect(crew.map(c => c.crewClass).sort()).toEqual(['astronaut', 'drone', 'rover'])
    expect(crew.every(c => c.selfTrained)).toBe(true)
  })

  it('retro-grants the starting crew to a save that predates the roster', () => {
    const player: Partial<Player> = { missionsDone: 7, francs: 12_000_000 }
    expect(migrateCrewRoster(player, NOW)).toHaveLength(STARTING_CREW.length)
  })

  it('does not re-grant the starting crew on a second load', () => {
    const once = migrateCrewRoster({}, NOW)
    expect(migrateCrewRoster({ crew: once }, NOW)).toHaveLength(STARTING_CREW.length)
  })

  it('keeps earned XP on a starting crew member rather than resetting them', () => {
    const once = migrateCrewRoster({}, NOW)
    const veteran = { ...once[0], xp: 900 }
    const reloaded = migrateCrewRoster({ crew: [veteran, ...once.slice(1)] }, NOW)
    expect(reloaded.find(c => c.id === veteran.id)?.xp).toBe(900)
  })

  it('treats an already-deployed starter rover as the starting rover, not a second one', () => {
    const player: Partial<Player> = {
      roverDeployments: [{ roverId: 'starter-rover', targetId: 'luna', clientId: 'helios', timestamp: NOW - 1000 }],
    }
    const crew = migrateCrewRoster(player, NOW)
    expect(crew.filter(c => c.crewClass === 'rover')).toHaveLength(1)
    expect(crew).toHaveLength(STARTING_CREW.length)
  })

  it('surfaces an existing save\'s rover as a roster entry', () => {
    const player: Partial<Player> = {
      roverDeployments: [{ roverId: 'starter-rover', targetId: 'luna', clientId: 'helios', timestamp: NOW - 1000 }],
    }
    const rovers = migrateCrewRoster(player, NOW).filter(c => c.crewClass === 'rover')
    expect(rovers).toHaveLength(1)
    expect(rovers[0]).toMatchObject({
      id: roverCrewId('starter-rover'), crewClass: 'rover', selfTrained: true, joinedAt: NOW - 1000,
    })
    // A rover the player already owned was never hired.
    expect('hireCost' in rovers[0]).toBe(false)
  })

  it('surfaces a rover exactly once across several deployments', () => {
    const player: Partial<Player> = {
      roverDeployments: [
        { roverId: 'starter-rover', targetId: 'luna', clientId: 'helios', timestamp: NOW - 3000 },
        { roverId: 'starter-rover', targetId: 'ceres', clientId: 'helios', timestamp: NOW - 1000 },
      ],
    }
    expect(migrateCrewRoster(player, NOW).filter(c => c.crewClass === 'rover')).toHaveLength(1)
  })

  it('is idempotent — a second load does not duplicate the migrated rover', () => {
    const player: Partial<Player> = {
      roverDeployments: [{ roverId: 'starter-rover', targetId: 'luna', clientId: 'helios', timestamp: NOW - 1000 }],
    }
    const once = migrateCrewRoster(player, NOW)
    expect(migrateCrewRoster({ ...player, crew: once }, NOW)).toHaveLength(once.length)
  })

  it('drops malformed roster entries from an untrusted save', () => {
    const player = { crew: [{ id: '', name: 'x', crewClass: 'astronaut' }, { nonsense: true }] } as unknown as Partial<Player>
    // Malformed entries are dropped; the starting crew is still granted.
    expect(migrateCrewRoster(player, NOW)).toHaveLength(STARTING_CREW.length)
  })

  it('repairs out-of-range level and xp rather than trusting the save', () => {
    const player = {
      crew: [{ id: 'c', name: 'Someone', crewClass: 'astronaut', level: -4, xp: -10, condition: 'melted' }],
    } as unknown as Partial<Player>
    const repaired = migrateCrewRoster(player, NOW).find(c => c.id === 'c')!
    expect(repaired).toMatchObject({ xp: 0, condition: 'fit' })
    expect(crewLevel(repaired)).toBe(1)
  })
})

describe('persistence through normalizeState', () => {
  it('round-trips a roster through a save', () => {
    const c = createCrewMember({ id: 'crew-1', crewClass: 'astronaut', selfTrained: true, now: NOW })
    const saved = JSON.parse(JSON.stringify(stateWithCrew([c])))
    expect(normalizeState(saved).player.crew).toContainEqual(c)
  })

  it('folds an existing save\'s rover into the roster exactly once', () => {
    const loaded = normalizeState({
      player: { roverDeployments: [{ roverId: 'starter-rover', targetId: 'luna', clientId: 'helios', timestamp: NOW }] },
    })
    expect(loaded.player.crew?.filter(c => c.crewClass === 'rover')).toHaveLength(1)
  })

  it('gives a fresh save the starting crew, not an empty roster', () => {
    expect(normalizeState({}).player.crew).toHaveLength(STARTING_CREW.length)
  })
})
