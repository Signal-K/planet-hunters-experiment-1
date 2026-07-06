// Pure state-transition functions for mining (laser) and rover mining systems.

import type { GameState } from '@/lib/game-types'

export function applyMiningDone(s: GameState, cargo: Record<string, number>, arrivalAt: number | null): GameState {
  if (s.screen !== 'mining' || !s.missionId || !s.targetId) return s
  return {
    ...s,
    lastCargo: cargo,
    player: {
      ...s.player,
      arrivalAt,
      missionPhase: 'transit',
      debriefPending: true,
      returningToEarth: true,
      shipDestroyed: false,
    },
    screen: 'transit',
  }
}

export function applyReturnArrived(s: GameState): GameState {
  if (!s.player.debriefPending || !s.lastCargo) return s
  const stash = { ...(s.player.stash ?? {}) }
  for (const [id, amount] of Object.entries(s.lastCargo)) {
    stash[id] = (stash[id] ?? 0) + amount
  }
  return {
    ...s,
    player: {
      ...s.player,
      stash,
      arrivalAt: null,
      missionPhase: 'debrief',
      debriefPending: false,
      returningToEarth: false,
      shipDestroyed: true,
    },
    screen: 'debrief',
    doneSteps: { ...s.doneSteps, 6: true },
  }
}

export function applyRoverMiningDone(s: GameState, cargo: Record<string, number>): GameState {
  if (s.screen !== 'rover-mining' || !s.missionId || !s.targetId) return s
  const stash = { ...(s.player.stash ?? {}) }
  for (const [id, amount] of Object.entries(cargo)) {
    stash[id] = (stash[id] ?? 0) + amount
  }
  return {
    ...s,
    lastCargo: cargo,
    player: { ...s.player, stash, arrivalAt: null, missionPhase: 'debrief' },
    screen: 'debrief',
  }
}
