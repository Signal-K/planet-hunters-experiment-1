import { describe, expect, it } from 'vitest'
import { EXTRACTION_STEPS, STORAGE_STEPS, TRANSPORT_STEPS, trainingCoachSteps } from '@/lib/data/tutorial'
import {
  AGENCY_TRAINING_STAGES,
  LEGACY_FREE_OPS_MISSIONS_DONE,
  agencyTrainingStage,
  agencyTrainingTrack,
  freeOperationsUnlocked,
  freeOpsActivities,
  TRANSPORT_LESSON_MISSIONS_DONE,
} from './AgencyOnboardingSystem'

describe('agency training constants', () => {
  it('keeps transport as a later Free Ops suggestion', () => {
    expect(TRANSPORT_LESSON_MISSIONS_DONE).toBe(1)
  })
})

describe('freeOperationsUnlocked', () => {
  it('needs the mining, scan and part tries', () => {
    expect(freeOperationsUnlocked({ placed: ['launchpad'], missionsDone: 1, flightPlan: { completed: { mining: true, scan: true }, hidden: false } })).toBe(false)
    expect(freeOperationsUnlocked({ placed: ['launchpad'], missionsDone: 2, flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: false } })).toBe(true)
  })

  it('keeps Free Ops for saves past the old three-mission onboarding, silo or not', () => {
    expect(freeOperationsUnlocked({ placed: ['launchpad'], missionsDone: LEGACY_FREE_OPS_MISSIONS_DONE })).toBe(true)
  })
})

describe('agencyTrainingStage', () => {
  it('walks mining → scan → part → Free Ops', () => {
    expect(agencyTrainingStage({ placed: [], missionsDone: 0 })).toBe('mining')
    expect(agencyTrainingStage({ placed: [], missionsDone: 0, flightPlan: { completed: { mining: true }, hidden: false } })).toBe('scan')
    expect(agencyTrainingStage({ placed: [], missionsDone: 0, flightPlan: { completed: { mining: true, scan: true }, hidden: false } })).toBe('part')
    expect(agencyTrainingStage({ placed: [], missionsDone: 0, flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: false } })).toBe('free-ops')
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
    const track = agencyTrainingTrack({ placed: ['launchpad'], missionsDone: 1, flightPlan: { completed: { mining: true }, hidden: false } })
    expect(track.map(step => step.status)).toEqual(['done', 'current', 'upcoming', 'upcoming'])
  })

  it('shows Free Ops as current once every try is done', () => {
    const track = agencyTrainingTrack({ placed: ['launchpad'], missionsDone: 2, flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: false } })
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
      ['hub', 'hub-build-storage-silo'],
      ['build', 'build-confirm|build-plot-open'],
    ])
  })
})

describe('freeOpsActivities', () => {
  it('offers client work, science, refinery, transport and storage suggestions', () => {
    expect(freeOpsActivities({}).map(activity => activity.id)).toEqual(['client-work', 'space-telescope', 'build-refinery', 'transport', 'storage-silo'])
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
