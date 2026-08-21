import type { Screen } from '@/lib/game-types'

const VALID_SCREENS = new Set<Screen>([
  'intro', 'build', 'hub', 'missions', 'galaxy', 'targets', 'fab',
  'transit', 'mining', 'delivery', 'debrief', 'refinery', 'market',
  'hangar', 'rocket-buy', 'skills', 'scan-station', 'rover-mining',
  'launchpad', 'surface-ops', 'academy',
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

    if (RESUMABLE_MISSION_SCREENS.has(screen as Screen)
      && typeof parsed.missionId === 'string'
      && typeof parsed.targetId === 'string') {
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
