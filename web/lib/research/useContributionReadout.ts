'use client'
import type { Player } from '@/lib/game-types'
import { pbLandnam } from '@/lib/pb-landnam'
import { contributionReadout } from './contribution'
import { useResearchPassport } from './useResearchPassport'
import type { StampKind } from './stamps'

export function useContributionReadout(player: Pick<Player, 'researchStamps'>, kind: StampKind, at: number) {
  const passport = useResearchPassport(at > 0, player.researchStamps, pbLandnam.authStore.record?.id ?? null)
  return contributionReadout(player, passport.data, kind, at)
}
