import { communityWorlds } from '@/lib/agency/community'
import type { GameState, Player } from '@/lib/game-types'
import { agencyTier, hasAgencyUnlock } from '@/lib/agency/construction-translation'
import type { Mission, MineralMeta, RocketModel, Target } from '@/lib/data/types'
import type { Catalog } from '@/lib/catalog'
import { rocketConfigForModel } from '@/lib/data/rockets'
import { validateBuild } from '@/lib/data/parts'
import { isArtifactMineralId } from '@/lib/data/minerals'
import { agencyRocket } from '@/lib/rockets'
import { rocketBuilderStats, asLoadout, loadoutBonuses } from '@/lib/launchpad/rocketBuilder'
import { communityBonusRate } from '@/lib/research/marketplace'
import { travelDurationMs, MISSION_ORBIT_MS } from '@/lib/data/flight'
import { supportsMissionAtTarget } from '@/lib/data/mission-locations'
import { MISSION_ZONES, type MissionZone } from '@/lib/data/mission-zone'
import { supportsSolarField } from '@/lib/takeon/solarField'
import { LANDNAM_TO_TAKEON_MINERAL } from '@/lib/takeon/minerals'

export type PlannedWork = 'mine' | 'survey' | 'deliver'
export interface MissionPlan { id: string; targetId: string; work: PlannedWork; mineral: string; amount: number; createdAt: number; zone?: MissionZone }
export interface DeliveryReceipt { targetId: string; cargo: Record<string, number>; at: number }
export function sanitizeMissionPlans(raw: unknown): Record<string, MissionPlan> {
  if (!raw || typeof raw !== 'object') return {}
  return Object.fromEntries(Object.entries(raw).filter(([id, value]) => {
    const p = value as MissionPlan
    return p && id === p.id && /^self-plan-[a-zA-Z0-9-]+$/.test(id) && typeof p.targetId === 'string' && typeof p.mineral === 'string'
      && ['mine', 'survey', 'deliver'].includes(p.work) && Number.isInteger(p.amount) && p.amount >= 1 && p.amount <= (p.work === 'survey' ? 24 : 999)
      && Number.isFinite(p.createdAt)
  }).map(([id, value]) => {
    const plan = value as MissionPlan
    if (plan.zone !== undefined && !MISSION_ZONES.includes(plan.zone)) {
      const { zone: _invalid, ...legacy } = plan
      return [id, legacy]
    }
    return [id, plan]
  }))
}
export function missionFromPlan(plan: MissionPlan, target: Target, minerals: Record<string, MineralMeta>): Mission {
  const meta = minerals[plan.mineral]
  const units = plan.amount * (meta?.cargoUnits ?? 1)
  const verb = plan.work === 'mine' ? 'Mine' : plan.work === 'survey' ? 'Survey' : 'Deliver to'
  const cargo = plan.work === 'survey' ? {} : { [plan.mineral]: plan.amount }
  return {
    id: plan.id, customPlan: plan, title: `${verb} ${target.name}`, brief: plan.work === 'survey'
      ? `Leave a probe in orbit to map ${plan.amount} sectors. Press SCAN at the Data hub to start, then download its readings as they arrive.`
      : plan.work === 'deliver' ? `Carry ${plan.amount} ${meta?.name ?? plan.mineral} from your Earth stash to your forward cache at ${target.name}. Cargo loads at launch.`
        : `Bring home ${plan.amount} ${meta?.name ?? plan.mineral}. Keep it or sell it on return.`,
    tag: 'PROGRAM', category: plan.work === 'mine' ? 'free-mining' : 'explore', difficulty: target.difficulty,
    locked: false, sequence: 99, targetId: target.id,
    ...(plan.work === 'deliver' ? { deliveryTargetId: target.id } : {}),
    ...(plan.work === 'survey' ? { payload: { type: 'satellite' as const, name: `Survey probe · ${plan.amount} sectors`, cargoCost: 0, instrumentId: 'survey-probe' as const } } : {}),
    ...(plan.work !== 'mine' ? { programReward: { researchXP: 0, outcome: plan.work === 'survey' ? `Probe in orbit at ${target.name} · mapping ${plan.amount} sectors for the Data hub` : `${plan.amount} ${meta?.name ?? plan.mineral} delivered to your forward cache at ${target.name}` } } : {}),
    requires: { minerals: cargo, cargo_min: plan.work === 'survey' ? 1 : units, drill_tier: plan.work === 'mine' ? Math.max(1, meta?.laserAccess ?? 1) : 1, max_orbit: target.orbit },
    payout: { francs: 0, affinity: 0 },
  }
}
export function plannerTargets(player: Player, catalog: Catalog, work: PlannedWork): Target[] {
  const range = Math.max(0, ...plannerRockets(player).map(model => rocketBuilderStats(rocketConfigForModel(model), asLoadout(player.shipCustomizerParts), catalog.parts, communityBonusRate(player).fuel).range))
  const confirmed = work === 'survey' ? communityWorlds(player.agencyCommunity) : []
  const targets = [...catalog.targets.filter(target => target.type !== 'exoplanet'), ...confirmed]
  return targets.filter(target => target.minerals.length > 0 && ['asteroid', 'planet', 'exoplanet'].includes(target.type) && target.orbit <= range
    && supportsMissionAtTarget(missionFromPlan({ id: 'self-plan-range', targetId: target.id, work, mineral: '', amount: 1, createdAt: 0 }, target, catalog.minerals), target)
    && (work === 'survey' || target.id !== 'venus')
    && plannerRockets(player).some(model => validateBuild({ mission: missionFromPlan({ id: 'self-plan-range', targetId: target.id, work: 'survey', mineral: '', amount: 1, createdAt: 0 }, target, catalog.minerals), target, rocket: rocketConfigForModel(model), parts: catalog.parts, loadoutBonus: loadoutBonuses(asLoadout(player.shipCustomizerParts)), fuelFraction: communityBonusRate(player).fuel, launchpadLevel: agencyTier(player, 'launch') }).ok)).sort((a, b) => a.orbit - b.orbit || a.name.localeCompare(b.name))
}
export function plannerMinerals(player: Player, target: Target | undefined, catalog: Catalog, work: PlannedWork): string[] {
  if (work === 'survey') return []
  return Object.keys(catalog.minerals).filter(id => !isArtifactMineralId(id) && (catalog.minerals[id].cargoUnits ?? 1) > 0 && (work === 'mine' ? target?.minerals.includes(id) : (player.stash?.[id] ?? 0) > 0))
}
export function planQuote(plan: MissionPlan, player: Player, catalog: Catalog) {
  const target = plannerTargets(player, catalog, plan.work).find(target => target.id === plan.targetId)
  const issues: string[] = []
  if (!player.freeOperations) issues.push('Finish training to plan your own mission.')
  if (!target) issues.push('Choose a reachable destination for this work.')
  if (plan.zone !== undefined && (plan.work === 'survey' || !supportsSolarField(plan.targetId))) issues.push('This landing site is only available for supported surface destinations.')
  if (plan.zone !== undefined && plan.work === 'deliver' && !LANDNAM_TO_TAKEON_MINERAL[plan.mineral]) issues.push('Choose cargo supported by the surface rover.')
  if (!Number.isInteger(plan.amount) || plan.amount < 1 || plan.amount > (plan.work === 'survey' ? 24 : 999)) issues.push(plan.work === 'survey' ? 'Choose 1–24 sectors.' : 'Choose a whole amount from 1 to 999.')
  if (plan.work !== 'survey' && !plannerMinerals(player, target, catalog, plan.work).includes(plan.mineral)) issues.push('Choose available ore for this work.')
  if (plan.work === 'deliver' && (player.stash?.[plan.mineral] ?? 0) < plan.amount) issues.push(`Earth stash has ${player.stash?.[plan.mineral] ?? 0}; delivery needs ${plan.amount}.`)
  if (plan.work === 'survey' && !hasAgencyUnlock(player, 'data-hub')) issues.push('Build the control station to launch a survey probe.')
  if (plan.work === 'survey' && player.probes?.[plan.targetId]) issues.push('A probe already orbits this body. Open it at the Data hub.')
  const mission = target ? missionFromPlan(plan, target, catalog.minerals) : null
  const models = mission && target ? plannerRockets(player).filter(model => validateBuild({ mission, target, rocket: rocketConfigForModel(model), parts: catalog.parts, loadoutBonus: loadoutBonuses(asLoadout(player.shipCustomizerParts)), fuelFraction: communityBonusRate(player).fuel, launchpadLevel: agencyTier(player, 'launch') }).ok) : []
  if (mission && !models.length) issues.push(`No available rocket fits: ${mission.requires.cargo_min} U cargo, orbit ${target!.orbit}, laser T${mission.requires.drill_tier}.`)
  return { target, mission, issues, rocket: models[0],
    outboundMs: target ? travelDurationMs(target, MISSION_ORBIT_MS) : 0 }
}
/** Load from Earth exactly at launch, after all launch guards. Plans never reserve ore. */
export function loadPlannedCargo(state: GameState, mission: Mission): GameState | null {
  const plan = mission.customPlan
  if (!plan) return state
  if (!state.player.freeOperations || state.player.activeMission || (state.screen !== 'fab' && state.screen !== 'launchpad' && !(state.screen === 'rocket-buy' && state.player.stagedRockets?.some(vehicle => vehicle.id === state.player.selectedStagedRocketId && vehicle.location === 'launchpad')))) return null
  if (plan.work === 'survey' && !hasAgencyUnlock(state.player, 'data-hub')) return null
  if (plan.work === 'survey' && state.player.probes?.[plan.targetId]) return null
  const stash = { ...(state.player.stash ?? {}) }
  if (plan.work === 'deliver') {
    if ((stash[plan.mineral] ?? 0) < plan.amount) return null
    stash[plan.mineral] -= plan.amount
  }
  return { ...state, deliveryTargetId: mission.deliveryTargetId ?? null, lastCargo: plan.work === 'deliver' ? { [plan.mineral]: plan.amount } : null, deliveredCargo: null,
    player: { ...state.player, stash, headingToDelivery: plan.work === 'deliver', returningToEarth: false, debriefPending: false, cargoSettledOffworld: false, homeDeliveryPending: false } }
}
export function sanitizeDeliveryReceipts(raw: Player['deliveryReceipts']): NonNullable<Player['deliveryReceipts']> {
  return Object.fromEntries(Object.entries(raw ?? {}).filter(([, receipt]) => receipt && typeof receipt.targetId === 'string' && Number.isFinite(receipt.at) && receipt.cargo && Object.values(receipt.cargo).every(n => Number.isFinite(n) && Number.isInteger(n) && n > 0)))
}
export function deliveryCache(player: Pick<Player, 'deliveryReceipts'>, targetId: string): Record<string, number> {
  const cargo: Record<string, number> = {}
  for (const receipt of Object.values(player.deliveryReceipts ?? {})) if (receipt.targetId === targetId) for (const [id, n] of Object.entries(receipt.cargo)) cargo[id] = (cargo[id] ?? 0) + n
  return cargo
}

function plannerRockets(player: Player): RocketModel[] {
  return [agencyRocket(player)]
}
