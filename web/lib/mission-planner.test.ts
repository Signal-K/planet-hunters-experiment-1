import { describe, expect, it } from 'vitest'
import { missionSiteCredit } from './community/site'
import { STATIC_CATALOG } from './catalog'
import { DEFAULT_STATE, mergeRemoteState, normalizeAndRepair } from './game-state'
import { buildRuntimeCatalog } from './runtimeCatalog'
import { plannerTargets, planQuote, missionFromPlan, loadPlannedCargo, deliveryCache, sanitizeMissionPlans, type MissionPlan } from './mission-planner'
import { applyDeliveryArrived, applyDeliveryUnloadComplete } from './systems/DeliverySystem'
import { applyReturnArrived } from './systems/MiningSystem'
import { placeProbe, sectorsMapped, nextSector, probeSectorGoal } from './probes/survey-probe'
const plan: MissionPlan = { id: 'self-plan-test', targetId: 'mercury', work: 'deliver', mineral: 'iron', amount: 3, createdAt: 100 }
const target = STATIC_CATALOG.targets.find(target => target.id === plan.targetId)!
const player = () => ({ ...structuredClone(DEFAULT_STATE.player), freeOperations: true, missionsDone: 3, placed: ['launchpad', 'control-station'], stash: { iron: 12 } })

describe('self-planned missions', () => {
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
  it('limits a planned survey to its chosen coverage and keeps ordinary probes mapping all 24 sectors', () => {
    const at = 1000
    const limited = placeProbe(player(), target.id, at, 6)
    const record = limited.probes![target.id]
    expect(probeSectorGoal(record)).toBe(6)
    expect(sectorsMapped(record, at + 48 * 3_600_000)).toHaveLength(6)
    expect(nextSector(record, at + 48 * 3_600_000)).toBeNull()
    const ordinary = placeProbe(player(), target.id, at)
    expect(sectorsMapped(ordinary.probes![target.id], at + 48 * 3_600_000)).toHaveLength(24)
    const survey = { ...plan, work: 'survey' as const, amount: 6 }
    expect(planQuote(survey, limited, STATIC_CATALOG).issues).toContain('A probe already orbits this body. Open it at the Data hub.')
  })
})
