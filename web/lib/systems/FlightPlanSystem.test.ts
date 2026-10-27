import { describe, expect, it } from 'vitest'
import {
  EMPTY_FLIGHT_PLAN,
  completeFlightPlanEvent,
  currentTrainingTry,
  earnsTrainingReplayReward,
  isTrainingComplete,
  replayFlightPlanTry,
  revealFlightPlanHint,
  skipFlightPlan,
  startFlightPlan,
} from './FlightPlanSystem'
import { TRAINING_TRIES, trainingStepOnPath, trainingPatchProgress, trainingTryPosition, trainingTryStep } from '@/lib/data/tutorial'

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

  it('pays only when a previously completed try finishes again', () => {
    const firstRun = replayFlightPlanTry(startFlightPlan(EMPTY_FLIGHT_PLAN, 1), 'mining')
    expect(earnsTrainingReplayReward(firstRun, 'mining')).toBe(false)
    const replay = replayFlightPlanTry({ ...EMPTY_FLIGHT_PLAN, completed: { mining: true } }, 'mining')
    expect(earnsTrainingReplayReward(replay, 'mining')).toBe(true)
  })

  it('the coach steps aside on screens unrelated to the try', () => {
    const wild = trainingTryStep('mining', 'mission-history')!
    expect(trainingStepOnPath(wild, 'mission-history')).toBe(false)
    expect(trainingStepOnPath(wild, 'skills')).toBe(false)
    expect(trainingStepOnPath(wild, 'hub')).toBe(true)
    expect(trainingStepOnPath(trainingTryStep('mining', 'mining')!, 'mining')).toBe(true)
    expect(trainingStepOnPath(trainingTryStep('scan', 'hub')!, 'hub')).toBe(true)
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
    for (const screen of ['missions', 'fab', 'mining', 'debrief']) {
      const step = trainingTryStep('mining', screen)
      expect(step?.try, screen).toBe('mining')
      expect(step?.screen, screen).toBe(screen)
    }
    // SSL-675: launch prep shares the launch step; flight and landing carry no step; the rover is not a first-run stop.
    for (const screen of ['targets', 'rocket-buy', 'rover-survey']) expect(trainingTryStep('mining', screen)?.id, screen).toBe('mine-launch')
    for (const screen of ['transit', 'landing', 'delivery']) {
      expect(trainingTryStep('mining', screen), screen).toBeUndefined()
      expect(trainingTryStep('scan', screen), screen).toBeUndefined()
    }
    expect(TRAINING_TRIES.filter(step => step.try === 'mining').length).toBeLessThanOrEqual(7)
    expect(TRAINING_TRIES.some(step => step.screen === 'rover-survey')).toBe(false)
    expect(trainingTryStep('part', 'hub')?.objective).toBe('Open the Hangar from Base')
    expect(trainingTryStep('scan', 'hub')?.objective).toBe('Open the Galaxy map')
    expect(trainingTryStep('mining', 'intro')?.objective).toBe('Choose where to build')
    // A screen with no step of its own (Control Station, Market) points back at the tower, not at a contracts button that is not there.
    expect(trainingTryStep('mining', 'instrument-hub')?.objective).toBe('Tap the tower to open client contracts')
    expect(trainingTryStep('mining', 'build')?.objective).toBe('Place the launchpad')
    expect(trainingTryStep('mining', 'hub')?.objective).toBe('Tap the tower to open client contracts')
  })

  it('SSL-675: puts the laser at stop 4 of the five-stop spine', () => {
    const position = (screen: string) => trainingTryPosition(trainingTryStep('mining', screen)!)
    expect(position('build')).toEqual({ index: 1, total: 5 })
    expect(position('missions')).toEqual({ index: 2, total: 5 })
    expect(position('fab')).toEqual({ index: 3, total: 5 })
    expect(position('targets')).toEqual({ index: 3, total: 5 })
    expect(position('mining')).toEqual({ index: 4, total: 5 })
    expect(position('debrief')).toEqual({ index: 5, total: 5 })
  })

  it('SSL-446: stitches the five mining stops and two scan/part steps', () => {
    expect(trainingPatchProgress('mining', 'mining', false, true)).toEqual({ stitched: 3, total: 5 })
    expect(trainingPatchProgress('mining', 'debrief', false, true)).toEqual({ stitched: 4, total: 5 })
    expect(trainingPatchProgress('mining', 'debrief', true, false)).toEqual({ stitched: 5, total: 5 })
    expect(trainingPatchProgress('scan', 'hub', false, true)).toEqual({ stitched: 0, total: 2 })
    expect(trainingPatchProgress('scan', 'galaxy', false, true)).toEqual({ stitched: 1, total: 2 })
    expect(trainingPatchProgress('part', 'hangar', true, false)).toEqual({ stitched: 2, total: 2 })
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
