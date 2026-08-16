import { describe, expect, it } from 'vitest'
import {
  ARTIFACT_NARRATIVE_MIN_MONITORING_LEVEL,
  artifactNarrativeEligible,
} from './science-narrative'

describe('artifact narrative gate', () => {
  it('waits for a confirmed planet at the late-game monitoring level', () => {
    expect(artifactNarrativeEligible({
      satelliteMonitoringLevel: ARTIFACT_NARRATIVE_MIN_MONITORING_LEVEL,
      verdict: 'planet',
      hasExistingClassification: false,
      seenAt: null,
    })).toBe(true)
  })

  it('does not fictionalise early or inconclusive classifications', () => {
    for (const input of [
      { satelliteMonitoringLevel: 2, verdict: 'planet' as const },
      { satelliteMonitoringLevel: 3, verdict: 'unsure' as const },
      { satelliteMonitoringLevel: 3, verdict: 'not_planet' as const },
    ]) {
      expect(artifactNarrativeEligible({
        ...input,
        hasExistingClassification: false,
        seenAt: null,
      })).toBe(false)
    }
  })

  it('is one-shot for an already classified subject or seen moment', () => {
    expect(artifactNarrativeEligible({
      satelliteMonitoringLevel: 3,
      verdict: 'planet',
      hasExistingClassification: true,
      seenAt: null,
    })).toBe(false)
    expect(artifactNarrativeEligible({
      satelliteMonitoringLevel: 3,
      verdict: 'planet',
      hasExistingClassification: false,
      seenAt: 123,
    })).toBe(false)
  })
})
