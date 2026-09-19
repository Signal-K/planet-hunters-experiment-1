import { describe, expect, it } from 'vitest'
import { dismissHubPrompt, isHubPromptDismissed } from './hub-prompts'

describe('hub prompts', () => {
  it('is visible until dismissed', () => {
    expect(isHubPromptDismissed(undefined, 'skills', 3)).toBe(false)
  })
  it('stays hidden at or below the dismissed value and reappears when it grows', () => {
    const d = dismissHubPrompt(undefined, 'skills', 3)
    expect(isHubPromptDismissed(d, 'skills', 3)).toBe(true)
    expect(isHubPromptDismissed(d, 'skills', 2)).toBe(true)
    expect(isHubPromptDismissed(d, 'skills', 4)).toBe(false)
  })
})
