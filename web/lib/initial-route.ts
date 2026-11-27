import type { Screen } from '@/lib/game-types'
import { migrateScreenId } from '@/lib/game-screens'

const VALID_SCREENS = new Set<Screen>([
  'intro', 'hub', 'missions', 'tess-discovery', 'targets', 'fab',
  'flight', 'mining', 'delivery', 'debrief',
  'hangar', 'rocket-buy',
  'launchpad',
  'mission-history',
])

const RESUMABLE_MISSION_SCREENS = new Set<Screen>([
  'targets', 'rocket-buy', 'fab', 'flight', 'mining',
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
 * including 'missions' itself — returns to the solar system. Shared by
 * returningScreen (localStorage-driven) and the auth-gate success handlers in
 * useAuthSync (live GameState-driven), so "land on the map after
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
 * Returning players should open at the solar system. The saved screen is a
 * navigation detail, not a home-page preference: in particular, a previous
 * visit to Contracts must not restore a stale location selection.
 * Preserve only a genuinely actionable mission flow or first-time placement.
 */
export function returningScreen(raw: string | null): Screen {
  if (!raw) return 'missions'

  try {
    const parsed = JSON.parse(raw) as SavedStateShape
    const screen = migrateScreenId(parsed.screen)
    if (typeof screen !== 'string' || !VALID_SCREENS.has(screen as Screen)) return 'missions'

    if (isResumableMissionScreen(screen, parsed.missionId as string | undefined, parsed.targetId as string | undefined)) {
      return screen as Screen
    }

    return 'missions'
  } catch {
    return 'missions'
  }
}
