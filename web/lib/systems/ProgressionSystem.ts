// Pure state-transition functions for player progression: skills, loans, mission abandonment.

import type { GameState, LicenseGrade } from '@/lib/game-types'
import type { Mission } from '@/lib/data'
import { canUnlockSkillNode, getSkillNode } from '@/lib/data'

const LOAN_AMOUNT = 500_000_000
const LICENSE_GRADE_XP_GATES: Record<LicenseGrade, number> = {
  'Grade I': 0,
  'Grade II': 100,
  'Grade III': 300,
}
const LICENSE_GRADE_ORDER: LicenseGrade[] = ['Grade I', 'Grade II', 'Grade III']

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

export function applyGainResearchXP(s: GameState, amount: number): GameState {
  if (!Number.isFinite(amount) || amount <= 0) return s
  return {
    ...s,
    player: {
      ...s.player,
      researchXP: (s.player.researchXP ?? 0) + Math.floor(amount),
    },
  }
}

export function applyUpgradeLicenseGrade(s: GameState, grade: Exclude<LicenseGrade, 'Grade I'>): GameState {
  const currentGrade = s.player.licenseGrade ?? 'Grade I'
  if (LICENSE_GRADE_ORDER.indexOf(grade) <= LICENSE_GRADE_ORDER.indexOf(currentGrade)) return s
  if ((s.player.researchXP ?? 0) < LICENSE_GRADE_XP_GATES[grade]) return s
  return {
    ...s,
    player: {
      ...s.player,
      licenseGrade: grade,
    },
  }
}

export function applyUnlockBlueprint(
  s: GameState,
  blueprintId: string,
  costFrancs = 0,
  costXP = 0,
  costMaterials: Record<string, number> = {},
): GameState {
  if (!blueprintId) return s
  const unlockedBlueprints = s.player.unlockedBlueprints ?? []
  if (unlockedBlueprints.includes(blueprintId)) return s
  const francsCost = Math.max(0, Math.floor(costFrancs))
  const xpCost = Math.max(0, Math.floor(costXP))
  if (s.player.francs < francsCost) return s
  if ((s.player.researchXP ?? 0) < xpCost) return s
  const stash = { ...(s.player.stash ?? {}) }
  for (const [mineralId, amount] of Object.entries(costMaterials)) {
    if ((stash[mineralId] ?? 0) < Math.max(0, Math.floor(amount))) return s
  }
  for (const [mineralId, amount] of Object.entries(costMaterials)) {
    stash[mineralId] = Math.max(0, (stash[mineralId] ?? 0) - Math.max(0, Math.floor(amount)))
  }
  return {
    ...s,
    player: {
      ...s.player,
      francs: s.player.francs - francsCost,
      researchXP: (s.player.researchXP ?? 0) - xpCost,
      stash,
      unlockedBlueprints: [...unlockedBlueprints, blueprintId],
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
      headingToDelivery: false,
      debriefPending: false,
      returningToEarth: false,
      shipDestroyed: false,
    },
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    lastCargo: null,
    screen: 'hub',
  }
}
