import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '@/lib/game-state'
import {
  HUB_PROMPT_TRANSIT_TELESCOPE,
  dismissHubPrompt,
  isHubPromptDismissed,
} from './hub-prompts'

function player(overrides: Partial<typeof DEFAULT_STATE.player> = {}) {
  return { ...DEFAULT_STATE.player, ...overrides }
}

describe('hub prompt dismissal', () => {
  it('keeps a dismissed telescope prompt hidden until the program launches', () => {
    const ready = player({ transitSatelliteLaunchedAt: null })
    const dismissed = dismissHubPrompt(ready, HUB_PROMPT_TRANSIT_TELESCOPE)
    expect(isHubPromptDismissed(dismissed, HUB_PROMPT_TRANSIT_TELESCOPE)).toBe(true)
  })
})
