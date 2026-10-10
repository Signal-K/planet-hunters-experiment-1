import { describe, expect, it } from 'vitest'
import { advanceLoopVisit, coreLoopStepForScreen, newlyCompletedTrainingTries } from './useCoreLoopAnalytics'

describe('core loop analytics', () => {
  it.each([
    ['hub', 'base'],
    ['missions', 'contract'],
    ['fab', 'launch'],
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

  it('counts each loop step once and starts a new loop after debrief', () => {
    const start = { fired: [] as const, loopId: 'loop-a' }
    const base = advanceLoopVisit('hub', { ...start, fired: [...start.fired] }, 'loop-b')
    expect(base.capture).toEqual({ step: 'base', loopId: 'loop-a' })
    const retry = advanceLoopVisit('hub', base, 'loop-b')
    expect(retry.capture).toBeNull()
    const preflight = advanceLoopVisit('fab', retry, 'loop-b')
    expect(preflight.capture).toEqual({ step: 'launch', loopId: 'loop-a' })
    const flight = advanceLoopVisit('transit', preflight, 'loop-b')
    expect(flight.capture).toBeNull()
    const debrief = advanceLoopVisit('debrief', flight, 'loop-b')
    expect(debrief.capture).toEqual({ step: 'debrief', loopId: 'loop-a' })
    expect(debrief.loopId).toBe('loop-b')
    expect(advanceLoopVisit('debrief', debrief, 'loop-c').capture).toBeNull()
    const nextBase = advanceLoopVisit('hub', debrief, 'loop-c')
    expect(nextBase.capture).toEqual({ step: 'base', loopId: 'loop-b' })
  })

  it('does not replay completion events for hydrated progress', () => {
    const completed = { mining: true as const, scan: true as const, part: true as const }
    expect(newlyCompletedTrainingTries(completed, completed)).toEqual([])
  })
})
