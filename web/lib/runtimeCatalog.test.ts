import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from './catalog'
import { buildRuntimeCatalog, TRANSIT_TELESCOPE_MISSION_ID, TRANSIT_TELESCOPE_TARGET_ID } from './runtimeCatalog'
import { tessCandidateToExoplanetTarget, toTessCandidate } from './data'
import { DEFAULT_STATE } from './game-state'
import { createCrewMember } from './systems/CrewSystem'

describe('buildRuntimeCatalog', () => {
  it('adds the transit telescope launch mission while the player has SMS but no launched satellite', () => {
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      satelliteMonitoringBuilt: true,
      transitSatelliteLaunchedAt: null,
      missionsDone: 3,
    })

    expect(catalog.targets.some(target => target.id === TRANSIT_TELESCOPE_TARGET_ID)).toBe(true)
    const telescopeMission = catalog.missions.find(mission => mission.id === TRANSIT_TELESCOPE_MISSION_ID)
    expect(telescopeMission).not.toHaveProperty('client')
    expect(telescopeMission).toMatchObject({
      payout: { francs: 0, affinity: 0 },
      programReward: expect.objectContaining({ outcome: expect.stringContaining('daily instrument feed') }),
    })
    expect(catalog.clients['mission-control']).toBeUndefined()
  })

  it('keeps the active transit telescope target in the catalog during route repair', () => {
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      satelliteMonitoringBuilt: true,
      transitSatelliteLaunchedAt: Date.now(),
      missionId: TRANSIT_TELESCOPE_MISSION_ID,
      targetId: TRANSIT_TELESCOPE_TARGET_ID,
      missionsDone: 3,
    })

    expect(catalog.targets.some(target => target.id === TRANSIT_TELESCOPE_TARGET_ID)).toBe(true)
    const activeTelescopeMission = catalog.missions.find(mission => mission.id === TRANSIT_TELESCOPE_MISSION_ID)
    expect(activeTelescopeMission).not.toHaveProperty('client')
    expect(activeTelescopeMission).toMatchObject({ programReward: expect.any(Object) })
  })

  it('turns discovered exoplanets into reachable survey missions and catalog targets', () => {
    const discovered = tessCandidateToExoplanetTarget(toTessCandidate({
      id: 'subject-42',
      tic_id: '42424242',
      toi_id: '4242.01',
      sectors: 'Sector 12',
      subject_type: 'transit',
      period_days: 2.4,
      depth_pct: 0.12,
      st_teff: 9500,
    }))
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      discoveredTargets: { [discovered.id]: discovered },
      freeOperations: true,
      satelliteMonitoringBuilt: true,
      transitSatelliteLaunchedAt: Date.now(),
      missionsDone: 4,
    })
    const surveyMission = catalog.missions.find(mission => mission.id === `exo-survey-${discovered.id}`)

    expect(catalog.targets.find(target => target.id === discovered.id)).toMatchObject({
      type: 'exoplanet',
      minerals: discovered.minerals,
    })
    expect(surveyMission).not.toHaveProperty('client')
    expect(surveyMission).toMatchObject({
      targetId: discovered.id,
      tag: 'SCIENCE',
      payout: { francs: 0, affinity: 0 },
      programReward: { researchXP: 25, outcome: expect.stringContaining('target intelligence') },
      requires: expect.objectContaining({ max_orbit: discovered.orbit }),
    })
  })

  it('adds diplomacy premiums and a co-funded joint mission after chart sharing', () => {
    const clientMission = STATIC_CATALOG.missions.find(mission =>
      !!mission.client
      && !!mission.targetId
      && STATIC_CATALOG.clients[mission.client]?.suppliesCrew,
    )!
    const clientId = clientMission.client!
    const diplomat = createCrewMember({
      id: 'crew-diplomat',
      crewClass: 'astronaut',
      selfTrained: true,
      now: Date.now(),
    })
    const player = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      crew: [diplomat],
      structureCrewAssignments: { diplomacy: diplomat.id },
      clientMissions: { [clientId]: 5 },
      sharedChartsByClient: { [clientId]: 1 },
    }
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: 4,
      player,
    })

    const improved = catalog.missions.find(mission => mission.id === clientMission.id)!
    expect(improved.payout.francs).toBeGreaterThan(clientMission.payout.francs)
    const joint = catalog.missions.find(mission => mission.id === `joint-${clientId}-${clientMission.id}`)
    expect(joint).toMatchObject({
      client: clientId,
      tag: 'JOINT',
      jointProject: {
        infrastructureOrbitBonus: 1,
        playerCost: expect.any(Number),
        clientCostShare: expect.any(Number),
        payoutBonus: expect.any(Number),
      },
    })
    expect(joint!.payout.francs).toBeGreaterThan(improved.payout.francs)
  })
})
