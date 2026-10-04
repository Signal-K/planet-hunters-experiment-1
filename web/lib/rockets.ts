import { ROCKET_MODELS, type Mission, type RocketModel } from '@/lib/data'

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

/** Cargo the vehicle must carry: mineral pickup plus any launch payload. */
export function missionCargoNeed(mission: Mission): number {
  return mission.requires.cargo_min + (mission.payload?.cargoCost ?? 0)
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
      label: 'Drill',
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
