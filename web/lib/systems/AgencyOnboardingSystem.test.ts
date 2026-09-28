import { describe, expect, it } from 'vitest'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import {
  AGENCY_TRAINING_STAGES,
  agencyTrainingStage,
  agencyTrainingTrack,
  TRANSPORT_LESSON_MISSIONS_DONE,
} from './AgencyOnboardingSystem'

describe('agencyTrainingStage', () => {
  it('starts a fresh player on placing the launchpad', () => {
    expect(agencyTrainingStage({ placed: [], missionsDone: 0 })).toBe('launchpad')
  })

  it('moves to extraction once the launchpad is placed', () => {
    expect(agencyTrainingStage({ placed: ['launchpad'], missionsDone: 0 })).toBe('extraction')
  })

  it('stays on extraction until the transport lesson mission', () => {
    expect(agencyTrainingStage({ placed: ['launchpad'], missionsDone: TRANSPORT_LESSON_MISSIONS_DONE - 1 })).toBe('extraction')
    expect(agencyTrainingStage({ placed: ['launchpad'], missionsDone: TRANSPORT_LESSON_MISSIONS_DONE })).toBe('transport')
  })

  it('asks for a storage silo after the onboarding missions', () => {
    expect(agencyTrainingStage({ placed: ['launchpad'], missionsDone: FREE_OPS_START_MISSIONS_DONE })).toBe('storage')
  })

  it('reaches Free Ops once the silo is built', () => {
    expect(agencyTrainingStage({ placed: ['launchpad', 'surface-silo'], missionsDone: FREE_OPS_START_MISSIONS_DONE })).toBe('free-ops')
  })

  it('does not send a player who has flown missions back to launchpad placement', () => {
    expect(agencyTrainingStage({ placed: [], missionsDone: 1 })).not.toBe('launchpad')
  })

  it('treats a non-finite missionsDone as a fresh save', () => {
    expect(agencyTrainingStage({ placed: [], missionsDone: Number.NaN })).toBe('launchpad')
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

  it('shows Free Ops as current at the end of training', () => {
    const track = agencyTrainingTrack({ placed: ['launchpad', 'surface-silo'], missionsDone: 10 })
    expect(track.at(-1)).toMatchObject({ stage: 'free-ops', status: 'current' })
  })
})
