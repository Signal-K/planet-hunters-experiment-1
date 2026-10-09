// Survey scans (SSL-512): the Free Ops way to chart a body. An owned telescope
// is pointed at a target, a timed scan runs, the body is charted, and the
// player earns research XP. Pure over GameState, like the other systems.

import type { GameState, Player } from '@/lib/game-types'
import type { Target } from '@/lib/data'
import { applyGainResearchXP } from './ProgressionSystem'

export const SURVEY_SCAN_DURATION_MS = 12_000
export const SURVEY_SCAN_RESEARCH_XP = 12

export type ScanPlayer = Pick<Player, 'freeOperations' | 'transitSatelliteLaunchedAt' | 'deepSpaceTelescopeBuilt' | 'deepSpaceTelescopeLaunchedAt' | 'activeScan' | 'chartedBodies'>

/** An owned telescope is what does the scanning. */
export function scanInstrumentLaunched(player: ScanPlayer): boolean {
  return !!player.freeOperations && !!(player.transitSatelliteLaunchedAt || player.deepSpaceTelescopeBuilt || player.deepSpaceTelescopeLaunchedAt)
}

/** Bodies a telescope can chart. Discovered exoplanets are charted by their discovery. */
export function scannableTargets(targets: readonly Target[]): Target[] {
  return targets.filter(target => target.type !== 'exoplanet')
}

export function scanProgress(player: Pick<Player, 'activeScan'>, now: number): number {
  const scan = player.activeScan
  if (!scan) return 0
  return Math.min(1, Math.max(0, (now - scan.startedAt) / SURVEY_SCAN_DURATION_MS))
}

export function applyStartScan(state: GameState, targetId: string, now: number = Date.now()): GameState {
  const player = state.player
  if (!scanInstrumentLaunched(player) || player.activeScan || player.chartedBodies?.[targetId]) return state
  return { ...state, player: { ...player, activeScan: { targetId, startedAt: now } } }
}

/** Finish a running scan once its time is up: chart the body and award research XP. */
export function applyResolveScan(state: GameState, now: number = Date.now()): GameState {
  const scan = state.player.activeScan
  if (!scan || now - scan.startedAt < SURVEY_SCAN_DURATION_MS) return state
  const charted = {
    ...state.player.chartedBodies,
    [scan.targetId]: { chartedAt: now, researchXpAwarded: SURVEY_SCAN_RESEARCH_XP },
  }
  const next = applyGainResearchXP({ ...state, player: { ...state.player, activeScan: null, chartedBodies: charted } }, SURVEY_SCAN_RESEARCH_XP)
  return next
}
