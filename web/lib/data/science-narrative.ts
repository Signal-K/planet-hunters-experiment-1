import type { TessVerdict } from './tess-candidates'

/** A late-game, evidence-led narrative interpretation of a real result. */
export const ARTIFACT_NARRATIVE_KIND = 'artifact-signal'
export const ARTIFACT_NARRATIVE_MIN_MONITORING_LEVEL = 3

export function artifactNarrativeEligible({
  satelliteMonitoringLevel,
  verdict,
  hasExistingClassification,
  seenAt,
}: {
  satelliteMonitoringLevel?: number
  verdict: TessVerdict
  hasExistingClassification: boolean
  seenAt?: number | null
}): boolean {
  return (satelliteMonitoringLevel ?? 1) >= ARTIFACT_NARRATIVE_MIN_MONITORING_LEVEL
    && verdict === 'planet'
    && !hasExistingClassification
    && !seenAt
}
