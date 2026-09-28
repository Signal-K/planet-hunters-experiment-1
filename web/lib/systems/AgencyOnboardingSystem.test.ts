import { describe, expect, it } from 'vitest'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import { EXTRACTION_STEPS, STORAGE_STEPS, TRANSPORT_STEPS, trainingCoachSteps } from '@/lib/data/tutorial'
import {
  AGENCY_TRAINING_STAGES,
  LEGACY_FREE_OPS_MISSIONS_DONE,
  agencyTrainingStage,
  agencyTrainingTrack,
  awaitingStorageSilo,
  freeOperationsUnlocked,
  freeOpsActivities,
  TRANSPORT_LESSON_MISSIONS_DONE,
} from './AgencyOnboardingSystem'

describe('agency training constants', () => {
  it('has two guided missions: Extraction, then Transport', () => {
    expect(FREE_OPS_START_MISSIONS_DONE).toBe(2)
    expect(TRANSPORT_LESSON_MISSIONS_DONE).toBe(1)
  })
})

describe('freeOperationsUnlocked', () => {
  it('needs both guided missions and a storage silo', () => {
    expect(freeOperationsUnlocked({ placed: ['launchpad'], missionsDone: 1 })).toBe(false)
    expect(freeOperationsUnlocked({ placed: ['launchpad'], missionsDone: 2 })).toBe(false)
    expect(freeOperationsUnlocked({ placed: ['launchpad', 'surface-silo'], missionsDone: 2 })).toBe(true)
  })

  it('keeps Free Ops for saves past the old three-mission onboarding, silo or not', () => {
    expect(freeOperationsUnlocked({ placed: ['launchpad'], missionsDone: LEGACY_FREE_OPS_MISSIONS_DONE })).toBe(true)
  })
})

describe('awaitingStorageSilo', () => {
  it('is true only between the Transport debrief and the silo placement', () => {
    expect(awaitingStorageSilo({ placed: ['launchpad'], missionsDone: 1 })).toBe(false)
    expect(awaitingStorageSilo({ placed: ['launchpad'], missionsDone: 2 })).toBe(true)
    expect(awaitingStorageSilo({ placed: ['launchpad', 'surface-silo'], missionsDone: 2 })).toBe(false)
    expect(awaitingStorageSilo({ placed: ['launchpad'], missionsDone: 5 })).toBe(false)
  })
})

describe('agencyTrainingStage', () => {
  it('walks Place Launchpad → Extraction → Transport → Storage → Free Ops', () => {
    expect(agencyTrainingStage({ placed: [], missionsDone: 0 })).toBe('launchpad')
    expect(agencyTrainingStage({ placed: ['launchpad'], missionsDone: 0 })).toBe('extraction')
    expect(agencyTrainingStage({ placed: ['launchpad'], missionsDone: 1 })).toBe('transport')
    expect(agencyTrainingStage({ placed: ['launchpad'], missionsDone: 2 })).toBe('storage')
    expect(agencyTrainingStage({ placed: ['launchpad', 'surface-silo'], missionsDone: 2 })).toBe('free-ops')
  })

  it('does not send a player who has flown missions back to launchpad placement', () => {
    expect(agencyTrainingStage({ placed: [], missionsDone: 1 })).not.toBe('launchpad')
  })

  it('treats a non-finite missionsDone as a fresh save', () => {
    expect(agencyTrainingStage({ placed: [], missionsDone: Number.NaN })).toBe('launchpad')
  })

  it('puts legacy Free Ops saves in Free Ops, not the Storage stage', () => {
    expect(agencyTrainingStage({ placed: ['launchpad'], missionsDone: LEGACY_FREE_OPS_MISSIONS_DONE })).toBe('free-ops')
  })
})

describe('agencyTrainingTrack', () => {
  it('lists every stage in order', () => {
    expect(agencyTrainingTrack({ placed: [], missionsDone: 0 }).map(step => step.stage)).toEqual([...AGENCY_TRAINING_STAGES])
  })

  it('marks earlier stages done and later ones upcoming', () => {
    const track = agencyTrainingTrack({ placed: ['launchpad'], missionsDone: TRANSPORT_LESSON_MISSIONS_DONE })
    expect(track.map(step => step.status)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming'])
  })

  it('shows Free Ops as current once the silo is built', () => {
    const track = agencyTrainingTrack({ placed: ['launchpad', 'surface-silo'], missionsDone: 2 })
    expect(track.at(-1)).toMatchObject({ stage: 'free-ops', status: 'current' })
  })
})

describe('trainingCoachSteps', () => {
  it('coaches each stage with its own step list and nothing in Free Ops', () => {
    expect(trainingCoachSteps('launchpad')).toBe(EXTRACTION_STEPS)
    expect(trainingCoachSteps('extraction')).toBe(EXTRACTION_STEPS)
    expect(trainingCoachSteps('transport')).toBe(TRANSPORT_STEPS)
    expect(trainingCoachSteps('storage')).toBe(STORAGE_STEPS)
    expect(trainingCoachSteps('free-ops')).toEqual([])
  })

  it('points the storage coach at the hub card and then an open build plot', () => {
    expect(STORAGE_STEPS.map(step => [step.screen, step.coachId])).toEqual([
      ['hub', 'progression-card-storage-silo'],
      ['build', 'build-confirm|build-plot-open'],
    ])
  })
})

describe('freeOpsActivities', () => {
  it('offers client work, space telescope and build refinery in that order', () => {
    expect(freeOpsActivities({}).map(activity => activity.id)).toEqual(['client-work', 'space-telescope', 'build-refinery'])
  })

  it('routes client work to the mission board', () => {
    expect(freeOpsActivities({})[0].screen).toBe('missions')
  })

  it('sends the telescope to the launchpad until one is in orbit, then to the instrument hub', () => {
    expect(freeOpsActivities({ transitSatelliteLaunchedAt: null })[1].screen).toBe('launchpad')
    expect(freeOpsActivities({ transitSatelliteLaunchedAt: 1 })[1].screen).toBe('instrument-hub')
  })

  it('sends build refinery to placement until a refinery exists', () => {
    expect(freeOpsActivities({ refineryBuilt: false })[2]).toMatchObject({ label: 'Build refinery', screen: 'build' })
    expect(freeOpsActivities({ refineryBuilt: true })[2]).toMatchObject({ label: 'Refinery', screen: 'refinery' })
  })
})
