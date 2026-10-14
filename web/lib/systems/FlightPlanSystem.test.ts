import { describe, expect, it } from 'vitest'
import {
  EMPTY_FLIGHT_PLAN,
  completeFlightPlanEvent,
  currentTrainingTry,
  isTrainingComplete,
  replayFlightPlanTry,
  revealFlightPlanHint,
  skipFlightPlan,
  startFlightPlan,
} from './FlightPlanSystem'
import { trainingTryPosition, trainingTryStep } from '@/lib/data/tutorial'

describe('FlightPlanSystem', () => {
  it('starts mining and reveals only one idle hint after eight seconds', () => {
    const started = startFlightPlan(EMPTY_FLIGHT_PLAN, 100)
    expect(currentTrainingTry(started)).toBe('mining')
    expect(revealFlightPlanHint(started, 8_099).hintShownFor).toBeUndefined()
    expect(revealFlightPlanHint(started, 8_100).hintShownFor).toBe('mining')
  })

  it('advances only when the active try receives its completion event', () => {
    const started = startFlightPlan(EMPTY_FLIGHT_PLAN, 100)
    expect(currentTrainingTry(completeFlightPlanEvent(started, 'tess-classified'))).toBe('mining')
    const mined = completeFlightPlanEvent(started, 'mining-debriefed')
    expect(currentTrainingTry(mined)).toBe('scan')
    const scanned = completeFlightPlanEvent(mined, 'tess-classified')
    expect(currentTrainingTry(scanned)).toBe('part')
    expect(isTrainingComplete(completeFlightPlanEvent(scanned, 'part-tweaked'))).toBe(true)
  })

  it('replays without erasing completed progress and persists a full skip', () => {
    const completedMining = { ...EMPTY_FLIGHT_PLAN, completed: { mining: true as const } }
    const replay = replayFlightPlanTry(completedMining, 'mining')
    expect(replay.completed.mining).toBe(true)
    expect(currentTrainingTry(replay)).toBe('mining')
    expect(isTrainingComplete(skipFlightPlan(replay))).toBe(true)
  })

  it('SSL-478: a replay of an unfinished try does not swallow the live try event', () => {
    const replayPart = replayFlightPlanTry(startFlightPlan(EMPTY_FLIGHT_PLAN, 1), 'part')
    expect(currentTrainingTry(replayPart)).toBe('part')
    const mined = completeFlightPlanEvent(replayPart, 'mining-debriefed')
    expect(mined.completed.mining).toBe(true)
    expect(mined.replayTry).toBeUndefined()
    expect(currentTrainingTry(mined)).toBe('scan')
  })

  it('SSL-478: a replay of a finished try drops when the player moves on', () => {
    const done = { ...EMPTY_FLIGHT_PLAN, completed: { mining: true as const } }
    const replay = replayFlightPlanTry(done, 'mining')
    const scanned = completeFlightPlanEvent(replay, 'tess-classified')
    expect(scanned.replayTry).toBeUndefined()
    expect(currentTrainingTry(scanned)).toBe('part')
  })

  it('SSL-478: every screen of the mining run shows a mining objective that matches it', () => {
    const run = ['launchpad', 'missions', 'fab', 'rover-survey', 'targets', 'mining', 'debrief', 'transit', 'landing', 'delivery']
    for (const screen of run) {
      const step = trainingTryStep('mining', screen)
      expect(step?.try, screen).toBe('mining')
      expect(step?.screen, screen).toBe(screen)
    }
    expect(trainingTryStep('part', 'hub')?.objective).toBe('Open the Hangar from Base')
    expect(trainingTryStep('scan', 'hub')?.objective).toBe('Open the Galaxy map')
    expect(trainingTryStep('mining', 'intro')?.objective).toBe('Begin operations')
    expect(trainingTryStep('mining', 'build')?.objective).toBe('Tap a build pad, then confirm')
    expect(trainingTryStep('mining', 'hub')?.objective).toBe('Tap the tower')
    expect(trainingTryStep('mining', 'transit')?.objective).toBe('Fly the cargo home')
    expect(trainingTryStep('mining', 'transit', { returning: false })?.objective).toBe('Boost toward the target')
    expect(trainingTryStep('mining', 'transit', { returning: true })?.objective).toBe('Fly the cargo home')
  })

  it('SSL-447: places the laser at step 5 of the six-milestone mining run', () => {
    const position = (screen: string) => trainingTryPosition(trainingTryStep('mining', screen)!)
    expect(position('missions')).toEqual({ index: 1, total: 6 })
    expect(position('fab')).toEqual({ index: 2, total: 6 })
    expect(position('targets')).toEqual({ index: 3, total: 6 })
    expect(position('rover-survey')).toEqual({ index: 4, total: 6 })
    expect(position('mining')).toEqual({ index: 5, total: 6 })
    expect(position('delivery')).toEqual({ index: 6, total: 6 })
  })

  it('SSL-478: walking the whole plan by real events reaches complete with no stuck step', () => {
    let p = startFlightPlan(EMPTY_FLIGHT_PLAN, 1)
    const seen: string[] = []
    for (const ev of ['mining-debriefed', 'tess-classified', 'part-tweaked'] as const) {
      seen.push(currentTrainingTry(p)!)
      p = completeFlightPlanEvent(p, ev)
    }
    expect(seen).toEqual(['mining', 'scan', 'part'])
    expect(isTrainingComplete(p)).toBe(true)
    expect(currentTrainingTry(p)).toBeNull()
  })
})
