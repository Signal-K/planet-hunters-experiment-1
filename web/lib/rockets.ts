import { agencyLevel } from '@/lib/agency/construction-translation'
import { agencyTier } from '@/lib/agency/construction-translation'
import type { Catalog } from '@/lib/catalog'
import { compatibleTargetsFor } from '@/lib/data/targets'
import { rocketConfigForModel } from '@/lib/data/rockets'
import { validateBuild } from '@/lib/data/parts'
import { asLoadout, loadoutBonuses } from '@/lib/launchpad/rocketBuilder'
import { communityBonusRate } from '@/lib/research/marketplace'
import { rocketPadLevel } from '@/lib/data/rockets'
import { hangarRocketDiscount } from '@/lib/data/building-levels'
import { ROCKET_MODELS, type Mission, type RocketModel } from '@/lib/data'
import { ROCKET_PRICES, } from '@/lib/data/economy'
import type { Player } from '@/lib/game-types'
import { onboardingMissionDone } from '@/lib/systems/FlightPlanSystem'

/** Training is over once the onboarding mission is flown (or, for older saves, any mission is done). */
export function pastRocketTraining(player: Pick<Player, 'flightPlan' | 'missionsDone'>): boolean {
  return onboardingMissionDone(player.flightPlan) || (player.missionsDone ?? 0) > 0
}

export type RocketPriceContext = { payloadType?: string }
type PricePlayer = Pick<Player, 'flightPlan' | 'missionsDone'> & Partial<Pick<Player, 'placed' | 'agencyLevels' | 'controlBuilt'>>

export function rocketPrice(rocket: Pick<RocketModel, 'costFrancs'>, player: PricePlayer, context: RocketPriceContext = {}): number {
  const list = rocket.costFrancs > 0 ? rocket.costFrancs : pastRocketTraining(player) ? ROCKET_PRICES.explorerAfterTraining : 0
  return Math.round(ROCKET_PRICE_MODIFIERS.reduce((price, modifier) => price * modifier.factor(player, context), list))
}

export function agencyRocket(player: Player): RocketModel {
  const pad = agencyTier(player, 'launch')
  return ROCKET_MODELS.filter(model => rocketUnlocked(model, player) && rocketPadLevel(model) <= pad).reduce(
    (best, model) => model.tier > best.tier ? model : best, ROCKET_MODELS[0],
  )
}

export function agencyTargets(mission: Mission, catalog: Pick<Catalog, 'parts' | 'targets'>, player: Player) {
  const assigned = rocketConfigForModel(agencyRocket(player))
  if (mission.payload?.type === 'rover') assigned.drill = 'cargo-module-t1'
  return compatibleTargetsFor(mission, catalog.targets).filter(target => {
    if (target.type === 'exoplanet') return false
    const staged = player.stagedRockets?.find(vehicle => vehicle.missionId === mission.id && vehicle.targetId === target.id)
    return validateBuild({
      mission, target, rocket: staged?.rocket ?? assigned, parts: catalog.parts,
      launchpadLevel: agencyTier(player, 'launch'),
      loadoutBonus: loadoutBonuses(asLoadout(player.shipCustomizerParts)), fuelFraction: communityBonusRate(player).fuel,
    }).ok
  })
}

export function getRequiredRocketModel(missionsDone: number): RocketModel {
  const eligible = unlockedRocketModels(missionsDone)

  return eligible.reduce<RocketModel | undefined>(
    (best, rocket) => !best || rocket.tier > best.tier ? rocket : best,
    undefined,
  ) ?? ROCKET_MODELS[0]
}

export function unlockedRocketModels(missionsDone: number): RocketModel[] {
  return ROCKET_MODELS.filter(
    rocket => !rocket.locked && rocket.missionsRequired <= missionsDone,
  )
}

export interface RocketFitCheck {
  key: 'cargo' | 'orbit' | 'drill'
  label: string
  have: string
  need: string
  ok: boolean
}

export function rocketMissionFit(rocket: RocketModel, mission: Mission): RocketFitCheck[] {
  const needCargo = missionCargoNeed(mission)
  return [
    {
      key: 'cargo',
      label: 'Cargo',
      have: `${rocket.stats.cargo}U`,
      need: needCargo === 0 ? 'NONE' : `${needCargo}U`,
      ok: rocket.stats.cargo >= needCargo,
    },
    {
      key: 'orbit',
      label: 'Orbit',
      have: `ORB ${rocket.stats.maxOrbit}`,
      need: `ORB ${mission.requires.max_orbit}`,
      ok: rocket.stats.maxOrbit >= mission.requires.max_orbit,
    },
    {
      key: 'drill',
      label: 'Laser',
      have: `T${rocket.stats.drillTier}`,
      need: `T${mission.requires.drill_tier}`,
      ok: rocket.stats.drillTier >= mission.requires.drill_tier,
    },
  ]
}

export function rocketCompatibleWithMission(rocket: RocketModel, mission: Mission): boolean {
  return rocketMissionFit(rocket, mission).every(check => check.ok)
}

function cheapestRocket(rockets: RocketModel[]): RocketModel | undefined {
  return [...rockets].sort((a, b) => a.costFrancs - b.costFrancs || a.tier - b.tier)[0]
}

/** Cheapest unlocked vehicle that can fly this job. Falls back to cheapest unlocked. */
export function selectRocketForMission(missionsDone: number, mission?: Mission | null): RocketModel {
  const unlocked = unlockedRocketModels(missionsDone)
  if (unlocked.length === 0) return ROCKET_MODELS[0]
  if (!mission) return cheapestRocket(unlocked) ?? ROCKET_MODELS[0]
  const compatible = unlocked.filter(rocket => rocketCompatibleWithMission(rocket, mission))
  return cheapestRocket(compatible.length > 0 ? compatible : unlocked) ?? ROCKET_MODELS[0]
}

/**
 * What one rocket is to one job. Bigger rockets never earn more; they are needed
 * for more cargo or a farther orbit (Liam, 2026-11-01). So the cheapest rocket
 * that fits is the one to fly, a bigger one is "not needed" and says what it is
 * for, and one that cannot fly the job says which limit it misses.
 */
export type RocketJobRole =
  | { kind: 'use' }
  | { kind: 'not-needed'; note: string }
  | { kind: 'too-small'; note: string }

/** `fits` is the caller's full check (mission plus destination); rockets it rejects are told why from the mission fit. */
export function rocketJobRoles(rockets: readonly RocketModel[], mission: Mission, fits: (rocket: RocketModel) => boolean): Map<string, RocketJobRole> {
  const fitting = rockets.filter(fits)
  const use = cheapestRocket(fitting)
  const roles = new Map<string, RocketJobRole>()
  for (const rocket of rockets) {
    if (!fitting.includes(rocket)) {
      const miss = rocketMissionFit(rocket, mission).find(check => !check.ok)
      const note = !miss ? 'Cannot reach this destination'
        : miss.key === 'cargo' ? `Too small: this job carries ${miss.need}`
        : miss.key === 'orbit' ? `Cannot reach ${miss.need}`
        : `Laser too weak: needs ${miss.need}`
      roles.set(rocket.id, { kind: 'too-small', note })
    } else if (rocket.id === use?.id) {
      roles.set(rocket.id, { kind: 'use' })
    } else {
      const base = use ?? rocket
      roles.set(rocket.id, { kind: 'not-needed', note: `Not needed: for more than ${base.stats.cargo}U or past ORB ${base.stats.maxOrbit}` })
    }
  }
  return roles
}

/** A rocket the player can build: announced, and either its mission count is met or it was researched. */
function rocketUnlocked(rocket: Pick<RocketModel, 'id' | 'locked' | 'missionsRequired'>, player: Pick<Player, 'missionsDone' | 'unlockedBlueprints'>): boolean {
  if (rocket.locked) return false
  return rocket.missionsRequired <= (player.missionsDone ?? 0) || !!player.unlockedBlueprints?.includes(rocketResearchId(rocket.id))
}

/**
 * A factor applied to the list price. The list is open: the economy will grow more reasons for a rocket to cost
 * more or less (client contracts, manufacturing pipelines, events), so add an entry here rather than a branch in
 * `rocketPrice`. Each factor must be pure over the player and must never throw on an old save.
 */
const ROCKET_PRICE_MODIFIERS: ReadonlyArray<{ id: string; factor: (player: PricePlayer, context: RocketPriceContext) => number }> = [
  // Rockets cost more the further the agency has progressed.
  { id: 'progress', factor: player => 1 + Math.min(ROCKET_PROGRESS_MAX_SURCHARGE, Math.max(0, (player.missionsDone ?? 0) - ROCKET_PROGRESS_GRACE_MISSIONS) * ROCKET_PROGRESS_STEP) },
  // Hardware missions (rovers; landers when they get their own payload type) cost a premium until the agency can
  // manufacture: each refining and ore-storage level takes `HARDWARE_PREMIUM_PER_LEVEL` off, down to list price.
  { id: 'hardware-premium', factor: (player, context) => {
    if (!context.payloadType || !HARDWARE_PAYLOADS.includes(context.payloadType)) return 1
    const capacity = agencyLevel(player, 'refining') + agencyLevel(player, 'ore-storage')
    return Math.max(1, HARDWARE_PREMIUM - capacity * HARDWARE_PREMIUM_PER_LEVEL)
  } },
  // SSL-792: an upgraded hangar builds rockets for less.
  { id: 'hangar-discount', factor: player => agencyLevel(player, 'rocket-discounts') > 0 ? 1 - hangarRocketDiscount(agencyLevel(player, 'rocket-discounts')) : 1 },
]

/** Cargo the vehicle must carry: mineral pickup plus any launch payload. */
function missionCargoNeed(mission: Mission): number {
  return mission.requires.cargo_min + (mission.payload?.cargoCost ?? 0)
}

/** Blueprint id a rocket researched early is stored under (player.unlockedBlueprints). */
function rocketResearchId(rocketId: string): string {
  return `rocket:${rocketId}`
}

/**
 * What a rocket costs this player now. Liam, 01.11: after the tutorial a rocket ALWAYS costs something, so a
 * model listed at no cost (the starter Explorer) is charged a set build price once training is over.
 */
/** Missions flown before a rocket starts costing more, and the extra per mission after that (SSL-892). Tunable. */
const ROCKET_PROGRESS_GRACE_MISSIONS = 10

const ROCKET_PROGRESS_STEP = 0.02

const ROCKET_PROGRESS_MAX_SURCHARGE = 1

const HARDWARE_PAYLOADS: readonly string[] = ['rover', 'lander']

const HARDWARE_PREMIUM = 3

const HARDWARE_PREMIUM_PER_LEVEL = 0.4
