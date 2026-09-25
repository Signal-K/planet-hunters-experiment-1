import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '@/lib/game-state'
import {
  HUB_PROMPT_SKILLS,
  HUB_PROMPT_TRANSIT_TELESCOPE,
  dismissHubPrompt,
  isHubPromptDismissed,
} from './hub-prompts'

function player(overrides: Partial<typeof DEFAULT_STATE.player> = {}) {
  return { ...DEFAULT_STATE.player, ...overrides }
}

describe('hub prompt dismissal', () => {
  it('hides a skill-point prompt until more points arrive', () => {
    const withPoints = player({ skillPoints: 3 })
    expect(isHubPromptDismissed(withPoints, HUB_PROMPT_SKILLS)).toBe(false)

    const dismissed = dismissHubPrompt(withPoints, HUB_PROMPT_SKILLS)
    expect(isHubPromptDismissed(dismissed, HUB_PROMPT_SKILLS)).toBe(true)
    expect(isHubPromptDismissed({ ...dismissed, skillPoints: 2 }, HUB_PROMPT_SKILLS)).toBe(true)
    expect(isHubPromptDismissed({ ...dismissed, skillPoints: 4 }, HUB_PROMPT_SKILLS)).toBe(false)
  })

  it('keeps a dismissed telescope prompt hidden until the program launches', () => {
    const ready = player({ transitSatelliteLaunchedAt: null })
    const dismissed = dismissHubPrompt(ready, HUB_PROMPT_TRANSIT_TELESCOPE)
    expect(isHubPromptDismissed(dismissed, HUB_PROMPT_TRANSIT_TELESCOPE)).toBe(true)
  })
})
