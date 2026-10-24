import type { Player } from '@/lib/game-types'

export const HUB_PROMPT_TRANSIT_TELESCOPE = 'transit-telescope'

export type HubPromptKey = typeof HUB_PROMPT_TRANSIT_TELESCOPE

export function hubPromptValue(key: HubPromptKey, player: Pick<Player, 'transitSatelliteLaunchedAt'>): number {
  return player.transitSatelliteLaunchedAt ? 0 : 1
}

export function isHubPromptDismissed(
  player: Pick<Player, 'dismissedHubPrompts' | 'transitSatelliteLaunchedAt'>,
  key: HubPromptKey,
): boolean {
  const dismissedAt = player.dismissedHubPrompts?.[key]
  if (dismissedAt == null) return false
  return dismissedAt >= hubPromptValue(key, player)
}

export function dismissHubPrompt(player: Player, key: HubPromptKey): Player {
  return {
    ...player,
    dismissedHubPrompts: {
      ...(player.dismissedHubPrompts ?? {}),
      [key]: hubPromptValue(key, player),
    },
  }
}
