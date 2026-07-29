import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from './catalog'
import { buildRuntimeCatalog, TRANSIT_TELESCOPE_MISSION_ID, TRANSIT_TELESCOPE_TARGET_ID } from './runtimeCatalog'
import { tessCandidateToExoplanetTarget, toTessCandidate } from './data'

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
    expect(catalog.missions.some(mission => mission.id === TRANSIT_TELESCOPE_MISSION_ID)).toBe(true)
    expect(catalog.clients['mission-control']?.name).toBe('Mission Control')
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
    expect(catalog.clients['mission-control']?.name).toBe('Mission Control')
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
    expect(surveyMission).toMatchObject({
      targetId: discovered.id,
      tag: 'SCIENCE',
      client: 'lumen-research',
      requires: expect.objectContaining({ max_orbit: discovered.orbit }),
    })
  })
})
