import type { Screen } from '@/lib/game-types'

const VALID_SCREENS = new Set<Screen>([
  'intro', 'build', 'hub', 'missions', 'galaxy', 'targets', 'fab',
  'transit', 'mining', 'delivery', 'debrief', 'refinery', 'market',
  'hangar', 'rocket-buy', 'skills', 'scan-station', 'rover-mining',
  'launchpad', 'surface-ops', 'academy',
  'mission-history',
])

const RESUMABLE_MISSION_SCREENS = new Set<Screen>([
  'targets', 'rocket-buy', 'fab', 'transit', 'mining', 'rover-mining',
  'delivery', 'debrief',
])

interface SavedStateShape {
  screen?: unknown
  missionId?: unknown
  targetId?: unknown
  player?: { placed?: unknown }
}

/**
 * True only for a screen that represents an in-flight mission the player was
 * actually mid-way through (has both a mission and target). Anything else —
 * including 'missions' itself — must land on Hub instead. Shared by
 * returningScreen (localStorage-driven) and the auth-gate success handlers in
 * useAuthSync (live GameState-driven), so "always land on Earth Base after
 * sign-in" stays a single rule instead of two copies that can drift.
 */
export function isResumableMissionScreen(
  screen: string | null | undefined,
  missionId: string | null | undefined,
  targetId: string | null | undefined,
): boolean {
  return typeof screen === 'string'
    && RESUMABLE_MISSION_SCREENS.has(screen as Screen)
    && typeof missionId === 'string'
    && typeof targetId === 'string'
}

/**
 * Returning players should open at the Earth Base. The saved screen is a
 * navigation detail, not a home-page preference: in particular, a previous
 * visit to Contracts must not make Contracts the post-login landing screen.
 * Preserve only a genuinely actionable mission flow or first-time placement.
 */
export function returningScreen(raw: string | null): Screen {
  if (!raw) return 'hub'

  try {
    const parsed = JSON.parse(raw) as SavedStateShape
    const screen = parsed.screen
    if (typeof screen !== 'string' || !VALID_SCREENS.has(screen as Screen)) return 'hub'

    if (isResumableMissionScreen(screen, parsed.missionId as string | undefined, parsed.targetId as string | undefined)) {
      return screen as Screen
    }

    if (screen === 'build' && Array.isArray(parsed.player?.placed) && parsed.player.placed.length === 0) {
      return 'build'
    }

    return 'hub'
  } catch {
    return 'hub'
  }
}
