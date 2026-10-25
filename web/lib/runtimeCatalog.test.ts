import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from './catalog'
import {
  buildRuntimeCatalog,
  DEEP_SPACE_TELESCOPE_MISSION_ID,
  DEEP_SPACE_TELESCOPE_TARGET_ID,
  TRANSIT_TELESCOPE_MISSION_ID,
  TRANSIT_TELESCOPE_TARGET_ID,
} from './runtimeCatalog'
import { tessCandidateToExoplanetTarget, toTessCandidate } from './data'
import { DEFAULT_STATE } from './game-state'

describe('buildRuntimeCatalog', () => {
  it('keeps an active Orionids run resolvable when a remote catalog omits the event row', () => {
    const catalog = buildRuntimeCatalog({
      catalog: { ...STATIC_CATALOG, missions: STATIC_CATALOG.missions.filter(mission => mission.id !== 'self-directed-orionids-night-run') },
      freeOperations: false,
      missionId: 'self-directed-orionids-night-run',
      missionsDone: 0,
    })

    expect(catalog.missions.find(mission => mission.id === 'self-directed-orionids-night-run')?.targetId).toBe('orionids-shower-field')
    expect(catalog.targets.find(target => target.id === 'orionids-shower-field')?.type).toBe('event-field')
  })
  it('offers the next Orionids tier only after debris capture', () => {
    const next = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: 3,
      player: { ...DEFAULT_STATE.player, freeOperations: true, orionidsEventStage: 1 },
    })
    expect(next.missions.find(mission => mission.id === 'self-directed-orionids-surface-research')).toMatchObject({
      payload: { type: 'rover' },
      requires: { minerals: {} },
    })
    const complete = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: 4,
      player: { ...DEFAULT_STATE.player, freeOperations: true, orionidsEventStage: 2 },
    })
    expect(complete.missions.some(mission => mission.id === 'self-directed-orionids-surface-research')).toBe(false)
  })

  it('offers the Orionids shower mission after the field guide is complete', () => {
    const ready = buildRuntimeCatalog({
      catalog: { ...STATIC_CATALOG, missions: STATIC_CATALOG.missions.filter(mission => mission.id !== 'self-directed-orionids-night-run') },
      freeOperations: true,
      missionsDone: 3,
      player: { ...DEFAULT_STATE.player, freeOperations: true, orionidsEventStage: 0, fireballSpotter: { readAt: 1, passedAt: 1 } },
    })
    expect(ready.missions.find(mission => mission.id === 'self-directed-orionids-night-run')?.targetId).toBe('orionids-shower-field')
    expect(ready.targets.find(target => target.id === 'orionids-shower-field')?.name).toBe('Orionids shower field')
  })
  it('adds a stored-haul mission for missing construction focus materials', () => {
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: 3,
      player: {
        ...DEFAULT_STATE.player,
        freeOperations: true,
        stash: { aluminium: 4 },
        resourceFocus: { label: 'Mineral Vault', minerals: { aluminium: 15, copper: 8 } },
      },
    })
    const mission = catalog.missions.find(item => item.id === 'focus-resource-mining')
    expect(mission?.requires.minerals).toEqual({ aluminium: 11, copper: 8 })
    expect(mission?.requires.cargo_min).toBe(19)
  })
  it('offers no satellite or telescope launch until a control station is built', () => {
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      transitSatelliteLaunchedAt: null,
      missionsDone: 3,
      player: { ...DEFAULT_STATE.player, freeOperations: true },
    })
    expect(catalog.missions.some(mission => mission.id === TRANSIT_TELESCOPE_MISSION_ID)).toBe(false)
  })
  it('adds the space telescope launch mission before the satellite is launched', () => {
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      transitSatelliteLaunchedAt: null,
      missionsDone: 3,
      player: { ...DEFAULT_STATE.player, freeOperations: true, placed: ['control-station'] },
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

  it('keeps the active space telescope target in the catalog during route repair', () => {
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

  it('has no separate deep space telescope launch: one telescope covers transits and asteroids', () => {
    const player = { ...DEFAULT_STATE.player, freeOperations: true, placed: ['control-station'] }
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 4, player })

    expect(catalog.targets.some(target => target.id === DEEP_SPACE_TELESCOPE_TARGET_ID)).toBe(false)
    expect(catalog.missions.some(mission => mission.id === DEEP_SPACE_TELESCOPE_MISSION_ID)).toBe(false)
    expect(catalog.missions.some(mission => mission.id === TRANSIT_TELESCOPE_MISSION_ID)).toBe(true)
  })

  it('stops offering the Space Telescope mission once launched or already owned in a legacy save', () => {
    const completedPlayer = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      transitSatelliteLevel: 2,
      clientMissions: { 'client-a': 10 },
      deepSpaceTelescopeLaunchedAt: Date.now(),
    }
    const placedPlayer = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      transitSatelliteLevel: 2,
      clientMissions: { 'client-a': 10 },
      placed: ['deep-space-telescope'],
    }
    const flagOnlyLegacyPlayer = {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      deepSpaceTelescopeBuilt: true,
    }

    for (const player of [completedPlayer, placedPlayer, flagOnlyLegacyPlayer]) {
      const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 4, player })
      expect(catalog.missions.some(mission => mission.id === DEEP_SPACE_TELESCOPE_MISSION_ID)).toBe(false)
    }
  })

  it('does not generate a retired scan-station operation', () => {
    const catalog = buildRuntimeCatalog({
      catalog: STATIC_CATALOG,
      freeOperations: true,
      missionsDone: 4,
      player: { ...DEFAULT_STATE.player, freeOperations: true },
    })
    expect(catalog.missions.some(mission => mission.id === 'story-scan-station-commission')).toBe(false)
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

    expect(catalog.missions.some(mission => mission.id === 'freeops-self-directed-mining')).toBe(true)
  })

})
