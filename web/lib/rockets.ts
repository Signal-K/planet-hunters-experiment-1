import { STARTER_ROCKETS, type StarterRocket } from '@/lib/data'

export function getRequiredStarterRocket(missionsDone: number): StarterRocket {
  const eligible = STARTER_ROCKETS.filter(
    rocket => !rocket.locked && rocket.missionsRequired <= missionsDone,
  )

  return eligible.reduce<StarterRocket | undefined>(
    (best, rocket) => !best || rocket.tier > best.tier ? rocket : best,
    undefined,
  ) ?? STARTER_ROCKETS[0]
}
