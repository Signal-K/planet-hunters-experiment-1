import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// SSL-626: the survey card appears over any screen when PostHog decides to show it, and it is styled inline, so the
// scene checks never reached it. A real staging playthrough caught SKIP at 34x22, SEND at 42px and 10-13px text.
describe('SurveySheet keeps the readability floors', () => {
  const source = readFileSync(join(__dirname, 'SurveySheet.tsx'), 'utf8')

  it('has no text under 14px', () => {
    expect(source).not.toMatch(/fontSize: (\d|1[0-3])\b/)
  })

  it('makes Skip, Next or Send, and each choice at least 44px tall', () => {
    expect(source.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(3)
  })
})
