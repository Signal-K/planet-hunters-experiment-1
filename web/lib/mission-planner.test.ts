import { describe, expect, it } from 'vitest'
import { missionSiteCredit } from './community/site'
import { STATIC_CATALOG } from './catalog'
import { DEFAULT_STATE, mergeRemoteState, normalizeAndRepair } from './game-state'
import { buildRuntimeCatalog } from './runtimeCatalog'
import { plannerTargets, planQuote, missionFromPlan, loadPlannedCargo, deliveryCache, sanitizeMissionPlans, type MissionPlan } from './mission-planner'
import { applyDeliveryArrived, applyDeliveryUnloadComplete } from './systems/DeliverySystem'
import { applyLandingTouchdown } from './systems/LandingSystem'
import { applyReturnArrived } from './systems/MiningSystem'
import { placeProbe, startProbeScan, sectorsMapped, nextSector, probeSectorGoal } from './probes/survey-probe'
const plan: MissionPlan = { id: 'self-plan-test', targetId: 'mercury', work: 'deliver', mineral: 'iron', amount: 3, createdAt: 100 }
const target = STATIC_CATALOG.targets.find(target => target.id === plan.targetId)!
const player = () => ({ ...structuredClone(DEFAULT_STATE.player), freeOperations: true, missionsDone: 3, placed: ['launchpad', 'control-station'], stash: { iron: 12 } })

describe('self-planned missions', () => {
  it('resumes a chosen delivery site through descent and settles its cargo once', () => {
    const sitePlan = { ...plan, zone: 'east' as const }
    const mission = missionFromPlan(sitePlan, target, STATIC_CATALOG.minerals)
    const state = { ...structuredClone(DEFAULT_STATE), screen: 'fab' as const, missionId: plan.id, targetId: target.id, player: player() }
    const loaded = loadPlannedCargo(state, mission)!
    const flying = { ...loaded, screen: 'flight' as const, player: { ...loaded.player, activeMission: { id: plan.id, label: 'Delivery', mission, target }, missionRunId: 'site-run' } }
    const descending = applyDeliveryArrived(flying, 2000)
    expect(descending.screen).toBe('landing')
    expect(descending.player.activeMission?.mission?.customPlan?.zone).toBe('east')
    const restored = normalizeAndRepair(JSON.parse(JSON.stringify(descending)))
    expect(restored.player.activeMission?.mission?.customPlan?.zone).toBe('east')
    const unloading = applyLandingTouchdown(restored)
    expect(unloading.screen).toBe('delivery')
    expect(unloading.lastCargo).toEqual({ iron: 3 })
    const returning = applyDeliveryUnloadComplete(unloading, 4000, 3000)
    expect(deliveryCache(returning.player, target.id)).toEqual({ iron: 3 })
    expect(applyDeliveryUnloadComplete(returning, 4000, 3000)).toBe(returning)
    expect(returning.player.stash?.iron).toBe(9)
  })
  it('offers reachable bodies and honest work-specific requirements and returns', () => {
    const p = player()
    const far = { ...target, id: 'too-far', orbit: 100 }
    const catalog = { ...STATIC_CATALOG, targets: [...STATIC_CATALOG.targets, far] }
    expect(plannerTargets(p, catalog, 'mine').some(target => ['jupiter', 'venus', 'too-far'].includes(target.id))).toBe(false)
    expect(plannerTargets(p, catalog, 'survey').some(target => target.id === 'jupiter')).toBe(true)
    const delivery = planQuote(plan, p, catalog)
    expect(delivery.issues).toEqual([])
    expect(delivery.mission?.requires).toMatchObject({ cargo_min: 3, drill_tier: 1, max_orbit: 1 })
    expect(delivery.outboundMs).toBe(10_500)
    expect(delivery.marketEstimate).toBe(0)
    expect(planQuote({ ...plan, amount: 13 }, p, catalog).issues).toContain('Earth stash has 12; delivery needs 13.')
    const mine = planQuote({ ...plan, work: 'mine' }, p, catalog)
    expect(mine.marketEstimate).toBeGreaterThan(0)
    expect(planQuote({ ...plan, work: 'survey', amount: 25 }, p, catalog).issues).toContain('Choose 1–24 sectors.')
  })
  it('restores a saved plan and generates the same normal-launch mission after a stale merge', () => {
    const state = { ...structuredClone(DEFAULT_STATE), screen: 'fab' as const, missionId: plan.id, targetId: plan.targetId, player: { ...player(), missionPlans: { [plan.id]: plan } } }
    const restored = normalizeAndRepair(JSON.parse(JSON.stringify(state)))
    expect(restored.screen).toBe('fab')
    const merged = mergeRemoteState(restored, DEFAULT_STATE)
    expect(merged.player.missionPlans?.[plan.id]).toEqual(plan)
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3, missionId: plan.id, targetId: plan.targetId, player: merged.player })
    expect(catalog.missions.find(mission => mission.id === plan.id)?.customPlan).toEqual(plan)
    expect(sanitizeMissionPlans({ bad: { ...plan, amount: -1 } })).toEqual({})
  })
  it('preserves a valid zone through save restoration and mission generation', () => {
    const zoned = { ...plan, zone: 'east' as const }
    const state = { ...structuredClone(DEFAULT_STATE), screen: 'fab' as const, missionId: zoned.id, targetId: zoned.targetId, player: { ...player(), missionPlans: { [zoned.id]: zoned } } }
    const restored = normalizeAndRepair(JSON.parse(JSON.stringify(state)))
    const catalog = buildRuntimeCatalog({ catalog: STATIC_CATALOG, freeOperations: true, missionsDone: 3, missionId: zoned.id, targetId: zoned.targetId, player: restored.player })
    expect(catalog.missions.find(mission => mission.id === zoned.id)?.customPlan?.zone).toBe('east')
    expect(sanitizeMissionPlans({ [zoned.id]: { ...zoned, zone: 'unknown' } })[zoned.id]).toEqual(plan)
  })
  it('accepts selected sites for mining but not orbital surveys', () => {
    const site = { ...plan, zone: 'east' as const }
    expect(planQuote({ ...site, work: 'mine' }, player(), STATIC_CATALOG).issues).toEqual([])
    expect(planQuote({ ...site, work: 'survey' }, player(), STATIC_CATALOG).issues).toContain('This landing site is only available for supported surface destinations.')
    expect(missionFromPlan({ ...site, work: 'mine' }, target, STATIC_CATALOG.minerals).customPlan?.zone).toBe('east')
  })
  it('retains a legacy gas-giant surface plan while flagging it for replanning', () => {
    const legacy = { ...plan, targetId: 'jupiter', work: 'mine' as const }
    const state = { ...structuredClone(DEFAULT_STATE), screen: 'fab' as const, missionId: legacy.id, targetId: legacy.targetId, player: { ...player(), missionPlans: { [legacy.id]: legacy } } }
    const restored = normalizeAndRepair(JSON.parse(JSON.stringify(state)))
    expect(restored.player.missionPlans?.[legacy.id]).toEqual(legacy)
    expect(planQuote(legacy, restored.player, STATIC_CATALOG).issues).toContain('Choose a reachable destination for this work.')
  })
  it('loads Earth cargo at launch, unloads exactly once, and never puts delivered cargo back on Earth', () => {
    const mission = missionFromPlan(plan, target, STATIC_CATALOG.minerals)
    const state = { ...structuredClone(DEFAULT_STATE), screen: 'fab' as const, missionId: plan.id, targetId: target.id, player: player() }
    const loaded = loadPlannedCargo(state, mission)!
    expect(state.player.stash.iron).toBe(12)
    expect(loaded.player.stash?.iron).toBe(9)
    expect(loaded.lastCargo).toEqual({ iron: 3 })
    const flying = { ...loaded, screen: 'flight' as const, player: { ...loaded.player, activeMission: { id: plan.id, label: 'Delivery', mission, target }, missionStartedAt: 1000 } }
    expect(loadPlannedCargo(flying, mission)).toBeNull()
    const unloading = applyDeliveryArrived(flying, 2000)
    const returning = applyDeliveryUnloadComplete(unloading, 4000, 3000)
    expect(deliveryCache(returning.player, target.id)).toEqual({ iron: 3 })
    expect(applyDeliveryUnloadComplete(returning, 4000, 3000)).toBe(returning)
    const home = applyReturnArrived(returning)
    expect(home.player.stash?.iron).toBe(9)
    expect(home.deliveredCargo).toEqual({ iron: 3 })
    expect(home.player.homeDeliveryPending).toBe(false)
    expect(missionSiteCredit(mission, home.deliveredCargo)).toBeNull()
    const merged = mergeRemoteState(home, DEFAULT_STATE)
    expect(deliveryCache(merged.player, target.id)).toEqual({ iron: 3 })
    expect(loadPlannedCargo({ ...state, player: { ...state.player, stash: { iron: 2 } } }, mission)).toBeNull()
  })
  it('loads a plan from review only when a real selected vehicle is already on the pad', () => {
    const mission = missionFromPlan(plan, target, STATIC_CATALOG.minerals)
    const state = { ...structuredClone(DEFAULT_STATE), screen: 'rocket-buy' as const, missionId: plan.id, targetId: target.id, player: player() }
    expect(loadPlannedCargo(state, mission)).toBeNull()
    const vehicle = { id: 'owned-pad', rocketId: 'explorer', rocket: state.rocket, location: 'launchpad' as const, source: 'company' as const, missionId: plan.id, targetId: target.id }
    const ready = { ...state, player: { ...state.player, stagedRockets: [vehicle], selectedStagedRocketId: vehicle.id } }
    expect(loadPlannedCargo(ready, mission)?.player.stash?.iron).toBe(9)
    expect(loadPlannedCargo({ ...ready, player: { ...ready.player, stagedRockets: [{ ...vehicle, location: 'hangar' }] } }, mission)).toBeNull()
  })
  it('limits a planned survey to its chosen coverage and keeps ordinary probes mapping all 24 sectors', () => {
    const at = 1000
    const limited = startProbeScan(placeProbe(player(), target.id, at, 6), target.id, at)
    const record = limited.probes![target.id]
    expect(probeSectorGoal(record)).toBe(6)
    expect(sectorsMapped(record, at + 48 * 3_600_000)).toHaveLength(6)
    expect(nextSector(record, at + 48 * 3_600_000)).toBeNull()
    const ordinary = startProbeScan(placeProbe(player(), target.id, at), target.id, at)
    expect(sectorsMapped(ordinary.probes![target.id], at + 48 * 3_600_000)).toHaveLength(24)
    const survey = { ...plan, work: 'survey' as const, amount: 6 }
    expect(planQuote(survey, limited, STATIC_CATALOG).issues).toContain('A probe already orbits this body. Open it at the Data hub.')
  })
})
