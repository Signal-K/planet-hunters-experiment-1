import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from '@/lib/catalog'
import {
  ACADEMY_RESEARCH_XP_COST,
  CREW_FIRST_HIRE_COST,
  CREW_HIRE_ESCALATION,
  CREW_MODULE_RESEARCH_XP_COST,
  CREW_QUIT_REFUND_RATE,
  CREW_TRAINING_DURATION_MS,
  CREW_WEEKLY_HIRE_CAP,
  type CrewMember,
  type Mission,
} from '@/lib/data'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { GameState, Player } from '@/lib/game-types'
import { createCrewMember, crewLevel } from './CrewSystem'
import {
  academyAffinityUnlocked,
  applyAssignCrewToStructure,
  applyAwardMissionCrewXP,
  applyCollectCrewTraining,
  applyHireCrew,
  applyResearchAcademy,
  applyResearchCrewModule,
  applyShareChartsWithClient,
  applyStartCandidateTraining,
  clientAffinityLevel,
  crewHireEligibility,
  crewRequirementStatus,
  diplomacyPayoutMultiplier,
  hireCost,
  jointMissionUnlocked,
  missionCrewForLaunch,
  settleCrewEconomy,
  utcDateKey,
  utcWeekKey,
} from './AcademySystem'

const NOW = Date.UTC(2026, 6, 30, 12)

function game(player: Partial<Player> = {}): GameState {
  return {
    ...DEFAULT_STATE,
    player: {
      ...DEFAULT_STATE.player,
      francs: 100_000_000,
      freeOperations: true,
      placed: ['astronaut-academy'],
      academyResearched: true,
      academyFunded: true,
      crew: [],
      formerCrew: [],
      ...player,
    },
  }
}

function astronaut(id = 'crew-test', selfTrained = true): CrewMember {
  return createCrewMember({ id, crewClass: 'astronaut', selfTrained, now: NOW })
}

describe('AcademySystem', () => {
  it('unlocks Academy research after two clients reach affinity level 2', () => {
    const threshold = 5
    expect(clientAffinityLevel(threshold - 1)).toBe(1)
    expect(clientAffinityLevel(threshold)).toBe(2)
    expect(academyAffinityUnlocked(game({
      clientMissions: { alpha: threshold, beta: threshold },
    }).player)).toBe(true)

    const researched = applyResearchAcademy(game({
      academyResearched: false,
      placed: [],
      researchXP: ACADEMY_RESEARCH_XP_COST,
      clientMissions: { alpha: threshold, beta: threshold },
    }))
    expect(researched.player.academyResearched).toBe(true)
    expect(researched.player.researchXP).toBe(0)
  })

  it('hires level-3 named astronauts with escalating costs and weekly limits', () => {
    let state = game({
      crewHireWeek: utcWeekKey(NOW),
      crewHiresThisWeek: 0,
      crewHiresLifetime: 0,
    })
    expect(hireCost(state.player)).toBe(CREW_FIRST_HIRE_COST)
    state = applyHireCrew(state, 'nasa', STATIC_CATALOG.clients, NOW)
    expect(state.player.crew).toHaveLength(1)
    expect(crewLevel(state.player.crew![0])).toBe(3)
    expect(state.player.crew![0]).toMatchObject({ sourceId: 'nasa', selfTrained: false })
    expect(hireCost(state.player)).toBe(Math.round(CREW_FIRST_HIRE_COST * CREW_HIRE_ESCALATION))

    for (let i = 1; i < CREW_WEEKLY_HIRE_CAP; i++) {
      state = applyHireCrew(state, 'esa', STATIC_CATALOG.clients, NOW + i)
    }
    const blocked = applyHireCrew(state, 'jaxa', STATIC_CATALOG.clients, NOW + 50)
    expect(blocked).toBe(state)
    expect(crewHireEligibility(state.player, 'jaxa', STATIC_CATALOG.clients, true, NOW).reason).toBe('weekly-cap')
  })

  it('requires client trust before that client can supply a hire', () => {
    const supplier = Object.values(STATIC_CATALOG.clients).find(client => client.suppliesCrew)!
    const sourceId = `client:${supplier.id}`
    const locked = game({ clientMissions: {} })
    expect(crewHireEligibility(locked.player, sourceId, STATIC_CATALOG.clients, true, NOW).reason).toBe('source-locked')

    const trusted = game({ clientMissions: { [supplier.id]: 5 } })
    expect(crewHireEligibility(trusted.player, sourceId, STATIC_CATALOG.clients, true, NOW).ok).toBe(true)
  })

  it('settles upkeep without debt and turns a departing hire into a re-hire offer', () => {
    const hire = { ...astronaut('paid-hire', false), hireCost: 2_000_000 }
    const state = game({
      francs: 0,
      crew: [hire],
      crewUpkeepSettledDate: utcDateKey(NOW - 24 * 60 * 60 * 1000),
    })
    const settled = settleCrewEconomy(state, NOW)
    expect(settled.player.francs).toBeGreaterThanOrEqual(0)
    expect(settled.player.crew).toHaveLength(0)
    expect(settled.player.formerCrew).toEqual([
      expect.objectContaining({
        member: expect.objectContaining({ id: hire.id }),
        rehireCost: Math.round(hire.hireCost * CREW_QUIT_REFUND_RATE),
      }),
    ])
    expect(settled.player.crewUpkeepSettledDate).toBe(utcDateKey(NOW))
  })

  it('runs a real-day candidate session and graduates a named specialist', () => {
    const started = applyStartCandidateTraining(game({ academyXP: 0 }), 'mining', NOW)
    expect(started.player.crewTraining).toHaveLength(1)
    const session = started.player.crewTraining![0]
    expect(session.completesAt - session.startedAt).toBe(CREW_TRAINING_DURATION_MS)
    expect(applyCollectCrewTraining(started, session.id, session.completesAt - 1)).toBe(started)

    const collected = applyCollectCrewTraining(started, session.id, session.completesAt)
    expect(collected.player.crewTraining).toHaveLength(0)
    expect(collected.player.crew).toHaveLength(1)
    expect(collected.player.crew![0]).toMatchObject({
      name: session.candidateName,
      selfTrained: true,
      specialisations: [{ branch: 'mining', tier: 1 }],
    })
    expect(collected.player.academyXP).toBeGreaterThan(0)
  })

  it('researches Crew Quarters and requires both the module and qualified crew for launch', () => {
    const specialist = {
      ...astronaut(),
      specialisations: [{ branch: 'mining' as const, tier: 1 }],
    }
    const mission: Mission = {
      id: 'crew-test-mission',
      title: 'Crew test',
      brief: '',
      tag: 'CREW',
      difficulty: 'L2',
      locked: false,
      sequence: 4,
      requires: {
        minerals: {},
        cargo_min: 0,
        drill_tier: 1,
        max_orbit: 2,
        crew: { branch: 'mining', minTier: 1, minLevel: 1 },
      },
      payout: { francs: 0, affinity: 0 },
    }
    const researched = applyResearchCrewModule(game({
      crew: [specialist],
      crewModuleResearched: false,
      researchXP: CREW_MODULE_RESEARCH_XP_COST,
    }))
    expect(researched.player.crewModuleResearched).toBe(true)
    expect(crewRequirementStatus(mission.requires.crew, researched.player.crew!).met).toBe(true)
    expect(missionCrewForLaunch(researched, mission)).toEqual([])

    const fitted = {
      ...researched,
      player: {
        ...researched.player,
        shipCustomizerParts: { 'crew-module': 'crew-quarters-t1' },
      },
    }
    expect(missionCrewForLaunch(fitted, mission)).toEqual([specialist.id])
  })

  it('honours the two-seat limit, grants mission XP, and uses recoverable injury instead of death', () => {
    const specialists = ['crew-a', 'crew-b'].map(id => ({
      ...astronaut(id),
      specialisations: [{ branch: 'engineering' as const, tier: 2 }],
    }))
    const mission: Mission = {
      id: 'hard-crewed-flight',
      title: 'Hard crewed flight',
      brief: '',
      tag: 'CREW',
      difficulty: 'L3',
      locked: false,
      sequence: 6,
      requires: {
        minerals: {},
        cargo_min: 0,
        drill_tier: 1,
        max_orbit: 5,
        crew: { branch: 'engineering', minTier: 2, minLevel: 1, count: 2 },
      },
      payout: { francs: 0, affinity: 0 },
    }
    const state = game({
      crew: specialists,
      crewModuleResearched: true,
      shipCustomizerParts: { 'crew-module': 'crew-quarters-t1' },
    })
    const assigned = missionCrewForLaunch(state, mission)
    expect(assigned).toEqual(specialists.map(member => member.id))

    const returned = applyAwardMissionCrewXP({
      ...state,
      player: {
        ...state.player,
        shipDestroyed: true,
        missionCrewIds: assigned,
      },
    }, 'award-1', NOW, true)
    expect(returned.player.crew).toHaveLength(2)
    expect(returned.player.crew).toEqual(expect.arrayContaining([
      expect.objectContaining({ condition: 'injured', recoveredAt: expect.any(Number) }),
    ]))
    expect(returned.player.crew![0].xp).toBeGreaterThan(specialists[0].xp)
  })

  it('staffs each structure once and unlocks chart-driven joint missions', () => {
    const member = astronaut()
    const supplier = Object.values(STATIC_CATALOG.clients).find(client => client.suppliesCrew)!
    let state = game({
      crew: [member],
      clientMissions: { [supplier.id]: 5 },
      targetScanCounts: { eros: 1 },
    })
    state = applyAssignCrewToStructure(state, 'diplomacy', member.id)
    expect(diplomacyPayoutMultiplier(state.player, supplier.id)).toBeGreaterThan(1)
    expect(jointMissionUnlocked(state.player, supplier.id)).toBe(false)

    state = applyShareChartsWithClient(state, supplier.id)
    expect(state.player.sharedChartsByClient?.[supplier.id]).toBe(1)
    expect(jointMissionUnlocked(state.player, supplier.id)).toBe(true)
  })
})
