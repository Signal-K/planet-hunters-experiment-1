import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '@/lib/game-state'
import {
  HUB_PROMPT_TRANSIT_TELESCOPE,
  dismissHubPrompt,
  isHubPromptDismissed,
  signalPromptKey,
} from './hub-prompts'
import { mergeRemoteState, normalizeState } from './game-state'

function player(overrides: Partial<typeof DEFAULT_STATE.player> = {}) {
  return { ...DEFAULT_STATE.player, ...overrides }
}

describe('hub prompt dismissal', () => {
  it('remembers each signal through reload, stale sync and changes in the ready count', () => {
    const key = signalPromptKey({ kind: 'transit', id: 'candidate-1' })
    const dismissed = dismissHubPrompt(player(), key)
    const saved = normalizeState({ ...DEFAULT_STATE, player: dismissed })
    const merged = mergeRemoteState(saved, DEFAULT_STATE)
    expect(isHubPromptDismissed(merged.player, key)).toBe(true)
    expect(isHubPromptDismissed(merged.player, signalPromptKey({ kind: 'transit', id: 'candidate-2' }))).toBe(false)
    expect(isHubPromptDismissed(merged.player, signalPromptKey({ kind: 'deep-space', id: 'candidate-1' }))).toBe(false)
  })
  it('keeps a dismissed telescope prompt hidden until the program launches', () => {
    const ready = player({ transitSatelliteLaunchedAt: null })
    const dismissed = dismissHubPrompt(ready, HUB_PROMPT_TRANSIT_TELESCOPE)
    expect(isHubPromptDismissed(dismissed, HUB_PROMPT_TRANSIT_TELESCOPE)).toBe(true)
  })
})
