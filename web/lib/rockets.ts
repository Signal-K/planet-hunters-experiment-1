import { ROCKET_MODELS, type RocketModel } from '@/lib/data'

export function getRequiredRocketModel(missionsDone: number): RocketModel {
  const eligible = ROCKET_MODELS.filter(
    rocket => !rocket.locked && rocket.missionsRequired <= missionsDone,
  )

  return eligible.reduce<RocketModel | undefined>(
    (best, rocket) => !best || rocket.tier > best.tier ? rocket : best,
    undefined,
  ) ?? ROCKET_MODELS[0]
}
