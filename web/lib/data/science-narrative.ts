import type { TessVerdict } from './tess-candidates'

/** A late-game, evidence-led narrative interpretation of a real result. */
export const ARTIFACT_NARRATIVE_KIND = 'artifact-signal'
export const ARTIFACT_NARRATIVE_MIN_MONITORING_LEVEL = 3

export function artifactNarrativeEligible({
  transitSatelliteLevel,
  verdict,
  hasExistingClassification,
  seenAt,
}: {
  transitSatelliteLevel?: number
  verdict: TessVerdict
  hasExistingClassification: boolean
  seenAt?: number | null
}): boolean {
  return (transitSatelliteLevel ?? 1) >= ARTIFACT_NARRATIVE_MIN_MONITORING_LEVEL
    && verdict === 'planet'
    && !hasExistingClassification
    && !seenAt
}
