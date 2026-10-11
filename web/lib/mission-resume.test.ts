import { describe, expect, it } from 'vitest'
import { missionResumeScreen } from './mission-resume'

describe('missionResumeScreen', () => {
  it('keeps a genuinely travelling run in transit', () => {
    expect(missionResumeScreen({ missionPhase: 'transit', arrivalAt: 2_000 }, 1_000)).toBe('transit')
  })

  it('opens the destination instead of flashing completed transit', () => {
    expect(missionResumeScreen({ missionPhase: 'transit', arrivalAt: 500 }, 1_000)).toBe('landing')
  })

  it('resumes a starter-rover survey on the survey surface, not the laser', () => {
    expect(missionResumeScreen({ missionPhase: 'survey' })).toBe('rover-survey')
  })

  it('resolves completed delivery and return legs', () => {
    expect(missionResumeScreen({ missionPhase: 'transit', arrivalAt: 500, headingToDelivery: true }, 1_000)).toBe('delivery')
    expect(missionResumeScreen({ missionPhase: 'transit', arrivalAt: 500, returningToEarth: true }, 1_000)).toBe('debrief')
  })
})
