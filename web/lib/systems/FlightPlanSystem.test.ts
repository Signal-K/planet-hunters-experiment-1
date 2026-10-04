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
})
