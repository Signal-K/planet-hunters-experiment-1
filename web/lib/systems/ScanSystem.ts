// Pure state-transition functions for the scanning station system.
// Each function takes current GameState and returns next GameState (or same if no change).

import type { GameState } from '@/lib/game-types'
import { SCANS_PER_DAY, SCAN_DURATION_MS } from '@/lib/data'
import { todayDateKey } from '@/lib/data'
import { structureIsStaffed } from './AcademySystem'

const RESEARCH_XP_PER_COMPLETED_SCAN = 10

export function scanLimitForPlayer(player: GameState['player']): number {
  return SCANS_PER_DAY + (structureIsStaffed(player, 'scan-station') ? 1 : 0)
}

export function applyBuildScanner(s: GameState): GameState {
  if (s.player.scannerBuilt) return s
  return { ...s, player: { ...s.player, scannerBuilt: true } }
}

export function applyStartScan(s: GameState, targetId: string): GameState {
  if (!s.player.scannerBuilt) return s
  if (s.player.activeScan) return s
  const today = todayDateKey()
  const scanDate = s.player.scanDate ?? ''
  const scansUsedToday = scanDate === today ? (s.player.scansUsedToday ?? 0) : 0
  if (scansUsedToday >= scanLimitForPlayer(s.player)) return s
  return {
    ...s,
    player: {
      ...s.player,
      activeScan: { targetId, completesAt: Date.now() + SCAN_DURATION_MS },
      scansUsedToday: scansUsedToday + 1,
      scanDate: today,
    },
  }
}

export function applyCollectScan(s: GameState): GameState {
  const scan = s.player.activeScan
  if (!scan || Date.now() < scan.completesAt) return s
  const prev = s.player.targetScanCounts ?? {}
  return {
    ...s,
    player: {
      ...s.player,
      activeScan: null,
      researchXP: (s.player.researchXP ?? 0) + RESEARCH_XP_PER_COMPLETED_SCAN,
      targetScanCounts: { ...prev, [scan.targetId]: (prev[scan.targetId] ?? 0) + 1 },
    },
  }
}
