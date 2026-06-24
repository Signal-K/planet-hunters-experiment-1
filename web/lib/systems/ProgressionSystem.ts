// Pure state-transition functions for player progression: skills, loans, mission abandonment.

import type { GameState } from '@/lib/game-types'
import type { Mission } from '@/lib/data'
import { canUnlockSkillNode, getSkillNode } from '@/lib/data'

const LOAN_AMOUNT = 500_000_000

export function applyUnlockSkillNode(s: GameState, id: string): GameState {
  const node = getSkillNode(id)
  if (!node) return s
  if (!canUnlockSkillNode({ id, skillPoints: s.player.skillPoints ?? 0, unlockedSkillNodes: s.player.unlockedSkillNodes ?? [] })) return s
  return {
    ...s,
    player: {
      ...s.player,
      skillPoints: (s.player.skillPoints ?? 0) - node.cost,
      unlockedSkillNodes: [...(s.player.unlockedSkillNodes ?? []), node.id],
    },
  }
}

export function applyAcceptLoan(s: GameState): GameState {
  return {
    ...s,
    popup: null,
    player: {
      ...s.player,
      francs: s.player.francs + LOAN_AMOUNT,
      loanDebt: s.player.loanDebt + LOAN_AMOUNT * 1.08,
      loanOffered: true,
    },
  }
}

export function applyAbandonMission(s: GameState, missions: Mission[]): GameState {
  const mission = s.missionId
    ? (missions.find(m => m.id === s.missionId)
       ?? s.player.dailyContractorPool?.missions.find(m => m.id === s.missionId)
       ?? null)
    : null
  const penalty = mission ? Math.round(mission.payout.francs * 0.1) : 0
  const dailyContractorPool = (s.missionId?.startsWith('dcp-') && s.player.dailyContractorPool)
    ? { ...s.player.dailyContractorPool, acceptedId: null }
    : s.player.dailyContractorPool
  return {
    ...s,
    player: {
      ...s.player,
      francs: Math.max(0, s.player.francs - penalty),
      activeMission: null,
      missionPhase: undefined,
      arrivalAt: null,
      dailyContractorPool,
    },
    missionId: null,
    targetId: null,
    screen: 'hub',
  }
}
