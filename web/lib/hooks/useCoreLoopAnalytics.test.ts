import { describe, expect, it } from 'vitest'
import { coreLoopStepForScreen, newlyCompletedTrainingTries } from './useCoreLoopAnalytics'

describe('core loop analytics', () => {
  it.each([
    ['hub', 'base'],
    ['missions', 'contract'],
    ['transit', 'launch'],
    ['mining', 'mine'],
    ['debrief', 'debrief'],
    ['build', 'build'],
  ] as const)('maps %s to the %s funnel step', (screen, step) => {
    expect(coreLoopStepForScreen(screen)).toBe(step)
  })

  it('does not treat screens outside the six-step loop as funnel steps', () => {
    expect(coreLoopStepForScreen('galaxy')).toBeNull()
    expect(coreLoopStepForScreen('hangar')).toBeNull()
    expect(coreLoopStepForScreen('market')).toBeNull()
  })

  it('reports only newly completed training tries', () => {
    expect(newlyCompletedTrainingTries(
      { mining: true },
      { mining: true, scan: true, part: true },
    )).toEqual(['scan', 'part'])
  })

  it('does not replay completion events for hydrated progress', () => {
    const completed = { mining: true as const, scan: true as const, part: true as const }
    expect(newlyCompletedTrainingTries(completed, completed)).toEqual([])
  })
})
