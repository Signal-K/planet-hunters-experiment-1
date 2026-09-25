import { describe, expect, it } from 'vitest'
import { FREE_OPS_START_MISSIONS_DONE, MISSIONS, ROCKET_MODELS, ROCKET_IDS, canonicalRocketId, missionsRequirementMet, rocketConfigForModel, rocketModelAvailable } from '@/lib/data'
import type { Mission } from '@/lib/data'
import { ROCKET_ASSETS } from './rocket-assets'
import {
  getRequiredRocketModel,
  rocketCompatibleWithMission,
  rocketMissionFit,
  selectRocketForMission,
} from './rockets'

const telescopeLaunch: Mission = {
  id: 'story-transit-telescope-launch',
  title: 'Launch Transit Telescope',
  brief: 'Deploy your own TESS-class telescope into Earth orbit.',
  tag: 'STORY',
  difficulty: 'L1',
  locked: false,
  sequence: 4,
  payload: { type: 'satellite', name: 'Transit Telescope', cargoCost: 0 },
  requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 1 },
  payout: { francs: 0, affinity: 0 },
}

describe('getRequiredRocketModel', () => {
  it('uses canonical runtime ids and resolves legacy ids only at the compatibility boundary', () => {
    expect(ROCKET_MODELS.slice(0, 2).map(rocket => rocket.id)).toEqual([ROCKET_IDS.explorer, ROCKET_IDS.prospector])
    expect(ROCKET_MODELS.some(rocket => /^sr\d$/.test(rocket.id))).toBe(false)
    expect(canonicalRocketId('sr1')).toBe(ROCKET_IDS.explorer)
    expect(canonicalRocketId('sr2')).toBe(ROCKET_IDS.prospector)
    expect(canonicalRocketId(ROCKET_IDS.explorer)).toBe(ROCKET_IDS.explorer)
  })

  it('returns the starter vehicle before later tiers unlock', () => {
    const rocket = getRequiredRocketModel(0)

    expect(rocket.locked).toBe(false)
    expect(rocket.missionsRequired).toBeLessThanOrEqual(0)
  })

  it('returns the highest-tier unlocked vehicle for current progression', () => {
    const missionsDone = Math.max(...ROCKET_MODELS.map(rocket => rocket.missionsRequired))
    const expectedTier = Math.max(
      ...ROCKET_MODELS
        .filter(rocket => !rocket.locked && rocket.missionsRequired <= missionsDone)
        .map(rocket => rocket.tier),
    )

    expect(getRequiredRocketModel(missionsDone).tier).toBe(expectedTier)
  })
})

describe('selectRocketForMission', () => {
  it('defaults the telescope launch to Explorer when both vehicles can fly it', () => {
    const explorer = ROCKET_MODELS.find(rocket => rocket.id === ROCKET_IDS.explorer)!
    const prospector = ROCKET_MODELS.find(rocket => rocket.id === ROCKET_IDS.prospector)!

    expect(rocketCompatibleWithMission(explorer, telescopeLaunch)).toBe(true)
    expect(rocketCompatibleWithMission(prospector, telescopeLaunch)).toBe(true)
    expect(selectRocketForMission(3, telescopeLaunch).id).toBe(ROCKET_IDS.explorer)
  })

  it('defaults M2 Heavy Haul to Prospector because Explorer cannot carry the job', () => {
    const heavyHaul = MISSIONS.find(mission => mission.sequence === 2)!
    const explorer = ROCKET_MODELS.find(rocket => rocket.id === ROCKET_IDS.explorer)!
    const prospector = ROCKET_MODELS.find(rocket => rocket.id === ROCKET_IDS.prospector)!

    expect(heavyHaul.requires.cargo_min).toBeGreaterThan(explorer.stats.cargo)
    expect(rocketCompatibleWithMission(explorer, heavyHaul)).toBe(false)
    expect(rocketCompatibleWithMission(prospector, heavyHaul)).toBe(true)
    expect(selectRocketForMission(1, heavyHaul).id).toBe(ROCKET_IDS.prospector)
  })

  it('reports cargo, orbit, and drill against the current job', () => {
    const explorer = ROCKET_MODELS.find(rocket => rocket.id === ROCKET_IDS.explorer)!
    const fit = rocketMissionFit(explorer, telescopeLaunch)

    expect(fit.map(check => check.key)).toEqual(['cargo', 'orbit', 'drill'])
    expect(fit.every(check => check.ok)).toBe(true)
    expect(fit.find(check => check.key === 'cargo')).toMatchObject({ have: '6U', need: 'NONE' })
  })
})

describe('rocketConfigForModel', () => {
  it('maps the selectable model names to their canonical unibody loadouts', () => {
    expect(rocketConfigForModel(ROCKET_MODELS.find(rocket => rocket.id === ROCKET_IDS.explorer))).toEqual({
      chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill',
    })
    expect(rocketConfigForModel(ROCKET_MODELS.find(rocket => rocket.id === ROCKET_IDS.prospector))).toEqual({
      chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2',
    })
  })
})

describe('rocket asset family', () => {
  it('keeps one exterior and blueprint pair per canonical vehicle', () => {
    expect(ROCKET_ASSETS.explorer.exterior).toContain('ship_sr1.png')
    expect(ROCKET_ASSETS.explorer.blueprint).toContain('sr1_cutaway.png')
    expect(ROCKET_ASSETS.prospector.exterior).toContain('ship_sr2.png')
    expect(ROCKET_ASSETS.prospector.blueprint).toContain('sr2_cutaway.png')
    expect(new Set(Object.values(ROCKET_ASSETS).map(assets => assets.exterior)).size).toBe(2)
    expect(new Set(Object.values(ROCKET_ASSETS).map(assets => assets.blueprint)).size).toBe(2)
  })
})

describe('rocket availability after the tutorial', () => {
  it('keeps the tutorial order: Prospector waits for M1', () => {
    const prospector = ROCKET_MODELS.find(model => model.id === ROCKET_IDS.prospector)!
    expect(rocketModelAvailable(prospector, 0)).toBe(false)
    expect(rocketModelAvailable(prospector, 1)).toBe(true)
  })

  it('never gates by mission count once Free Operations starts', () => {
    expect(missionsRequirementMet(FREE_OPS_START_MISSIONS_DONE + 5, 1)).toBe(false)
    expect(missionsRequirementMet(FREE_OPS_START_MISSIONS_DONE + 5, FREE_OPS_START_MISSIONS_DONE)).toBe(true)
  })

  it('still hides models that are not built yet', () => {
    const unannounced = ROCKET_MODELS.find(model => model.id === ROCKET_IDS.unannounced3)!
    expect(rocketModelAvailable(unannounced, FREE_OPS_START_MISSIONS_DONE + 10)).toBe(false)
  })
})
