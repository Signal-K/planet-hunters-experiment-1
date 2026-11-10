// Survey scans (SSL-512): the Free Ops way to chart a body. An owned telescope
// is pointed at a target, a timed scan runs, the body is charted, and the
// player earns research XP. Pure over GameState, like the other systems.

import type { GameState, Player } from '@/lib/game-types'
import type { Target } from '@/lib/data'
import { applyGainResearchXP } from './ProgressionSystem'

export const SURVEY_SCAN_DURATION_MS = 12_000
export const SURVEY_SCAN_RESEARCH_XP = 12
/** SSL-803: a finished scan sometimes asks the player to confirm it by hand in an instrument. */
export const FOLLOW_UP_ONE_IN = 3
export const FOLLOW_UP_BONUS_XP = 10
export const FOLLOW_UP_BONUS_FRAGMENTS = 1
export type FollowUpProject = 'tess' | 'asteroid' | 'saturn'

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

/** Which instrument analyses a scanned body: asteroids go to the deep-space scope, Saturn's moons to the imager, worlds to the transit scope. */
export function followUpProject(target: Pick<Target, 'id' | 'type'> | undefined): FollowUpProject {
  if (target?.type === 'asteroid') return 'asteroid'
  if (target && /enceladus|titan|saturn|mimas|rhea|dione|iapetus/.test(target.id)) return 'saturn'
  return 'tess'
}

/** Deterministic, so a reload cannot re-roll it: about one scan in three asks for a confirmation. */
export function scanAsksFollowUp(targetId: string, at: number): boolean {
  let h = 0
  for (const ch of `${targetId}:${Math.floor(at / 1000)}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % FOLLOW_UP_ONE_IN === 0
}

/** The player did a manual analysis in `project`: pay the bonus for the pending confirmation, once. */
export function applyScanFollowUpBonus(state: GameState, project: FollowUpProject): GameState {
  const pending = state.player.scanFollowUp
  if (!pending || pending.project !== project) return state
  const withFragments: GameState = {
    ...state,
    player: { ...state.player, scanFollowUp: null, researchFragments: (state.player.researchFragments ?? 0) + FOLLOW_UP_BONUS_FRAGMENTS },
  }
  return applyGainResearchXP(withFragments, FOLLOW_UP_BONUS_XP)
}

/** Finish a running scan once its time is up: chart the body, award research XP, and sometimes ask for a manual confirmation. */
export function applyResolveScan(state: GameState, now: number = Date.now(), targets?: readonly Target[]): GameState {
  const scan = state.player.activeScan
  if (!scan || now - scan.startedAt < SURVEY_SCAN_DURATION_MS) return state
  const charted = {
    ...state.player.chartedBodies,
    [scan.targetId]: { chartedAt: now, researchXpAwarded: SURVEY_SCAN_RESEARCH_XP },
  }
  const askFollowUp = !state.player.scanFollowUp && scanAsksFollowUp(scan.targetId, scan.startedAt)
  const scanFollowUp = askFollowUp
    ? { targetId: scan.targetId, project: followUpProject(targets?.find(item => item.id === scan.targetId)), at: now }
    : state.player.scanFollowUp
  return applyGainResearchXP({ ...state, player: { ...state.player, activeScan: null, chartedBodies: charted, scanFollowUp } }, SURVEY_SCAN_RESEARCH_XP)
}
