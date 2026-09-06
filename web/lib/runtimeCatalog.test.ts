import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STATIC_CATALOG } from './catalog'
import {
  buildRuntimeCatalog,
  DEEP_SPACE_TELESCOPE_MISSION_ID,
  DEEP_SPACE_TELESCOPE_TARGET_ID,
  SCAN_STATION_MISSION_ID,
  SCAN_STATION_TARGET_ID,
  TRANSIT_TELESCOPE_MISSION_ID,
  TRANSIT_TELESCOPE_TARGET_ID,
} from './runtimeCatalog'
import { tessCandidateToExoplanetTarget, toTessCandidate } from './data'
import { DEFAULT_STATE } from './game-state'
import { createCrewMember } from './systems/CrewSystem'

describe('buildRuntimeCatalog', () => {
  it('adds the transit telescope launch mission before the satellite is launched', () => {
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
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

  it('adds the deep space telescope survey mission once the telescope/affinity threshold is met but the mission is unfinished (KES-128)', () => {
    const player = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      transitSatelliteLevel: 2,
      clientMissions: { 'client-a': 10 },
      deepSpaceTelescopeMissionCompletedAt: null,
    }
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: 4,
      player,
    })

    expect(catalog.targets.some(target => target.id === DEEP_SPACE_TELESCOPE_TARGET_ID)).toBe(true)
    const surveyMission = catalog.missions.find(mission => mission.id === DEEP_SPACE_TELESCOPE_MISSION_ID)
    expect(surveyMission).not.toHaveProperty('client')
    expect(surveyMission).toMatchObject({
      tag: 'STORY',
      payload: { type: 'deep-space-survey' },
      payout: { francs: 0, affinity: 0 },
      programReward: expect.objectContaining({ outcome: expect.stringContaining('surveyed') }),
    })
  })

  it('does not offer the deep space telescope mission below the telescope/affinity threshold', () => {
    const player = { ...DEFAULT_STATE.player, freeOperations: true, transitSatelliteLevel: 1, clientMissions: {} }
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: 4,
      player,
    })

    expect(catalog.missions.some(mission => mission.id === DEEP_SPACE_TELESCOPE_MISSION_ID)).toBe(false)
  })

  it('stops offering the deep space telescope mission once it has been completed or the telescope is already placed', () => {
    const completedPlayer = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      transitSatelliteLevel: 2,
      clientMissions: { 'client-a': 10 },
      deepSpaceTelescopeMissionCompletedAt: Date.now(),
    }
    const placedPlayer = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      transitSatelliteLevel: 2,
      clientMissions: { 'client-a': 10 },
      placed: ['deep-space-telescope'],
    }

    for (const player of [completedPlayer, placedPlayer]) {
      const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 4, player })
      expect(catalog.missions.some(mission => mission.id === DEEP_SPACE_TELESCOPE_MISSION_ID)).toBe(false)
    }
  })

  describe('scan station commission mission (KES-132)', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_FEATURE_SCAN_STATION', 'true')
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
      vi.resetModules()
    })

    it('adds the scan station commission mission once Free Ops is reached and the flag is on', async () => {
      const { buildRuntimeCatalog: freshBuild } = await import('./runtimeCatalog')
      const { DEFAULT_STATE: freshDefault } = await import('./game-state')
      const player = { ...freshDefault.player, freeOperations: true, scanStationMissionCompletedAt: null }
      const catalog = freshBuild({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 4, player })

      expect(catalog.targets.some(target => target.id === SCAN_STATION_TARGET_ID)).toBe(true)
      const commissionMission = catalog.missions.find(mission => mission.id === SCAN_STATION_MISSION_ID)
      expect(commissionMission).not.toHaveProperty('client')
      expect(commissionMission).toMatchObject({
        tag: 'STORY',
        payload: { type: 'scan-station-commission' },
        payout: { francs: 0, affinity: 0 },
        programReward: expect.objectContaining({ outcome: expect.stringContaining('commissioned') }),
      })
    })

    it('does not offer the mission with the feature flag off, even in Free Ops', async () => {
      vi.unstubAllEnvs()
      vi.resetModules()
      const { buildRuntimeCatalog: freshBuild } = await import('./runtimeCatalog')
      const { DEFAULT_STATE: freshDefault } = await import('./game-state')
      const player = { ...freshDefault.player, freeOperations: true }
      const catalog = freshBuild({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 4, player })
      expect(catalog.missions.some(mission => mission.id === SCAN_STATION_MISSION_ID)).toBe(false)
    })

    it('stops offering the mission once it has been completed or the station is already placed', async () => {
      const { buildRuntimeCatalog: freshBuild } = await import('./runtimeCatalog')
      const { DEFAULT_STATE: freshDefault } = await import('./game-state')
      const completedPlayer = { ...freshDefault.player, freeOperations: true, scanStationMissionCompletedAt: Date.now() }
      const placedPlayer = { ...freshDefault.player, freeOperations: true, placed: ['scan-station'] }

      for (const player of [completedPlayer, placedPlayer]) {
        const catalog = freshBuild({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 4, player })
        expect(catalog.missions.some(mission => mission.id === SCAN_STATION_MISSION_ID)).toBe(false)
      }
    })
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

  it('keeps a self-directed launchpad run when the remote catalog omits owned mining rows', () => {
    const remoteCatalog = {
      ...STATIC_CATALOG,
      missions: STATIC_CATALOG.missions.filter(mission =>
        !(mission.tag === 'FREE OPS' && !mission.client && !mission.payload && !mission.construction),
      ),
    }
    const catalog = buildRuntimeCatalog({
      catalog: remoteCatalog,
      freeOperations: true,
      missionsDone: 4,
      player: { ...DEFAULT_STATE.player, freeOperations: true },
    })

    expect(catalog.missions.some(mission =>
      mission.tag === 'FREE OPS' && !mission.client && !mission.payload && !mission.construction,
    )).toBe(true)
  })

  it('does not add diplomacy premiums or affinity-gated joint missions', () => {
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
    expect(improved.payout.francs).toBe(clientMission.payout.francs)
    const joint = catalog.missions.find(mission => mission.id === `joint-${clientId}-${clientMission.id}`)
    expect(joint).toBeUndefined()
  })
})
