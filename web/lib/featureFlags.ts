/**
 * Build-time feature switches exposed to the client bundle.
 *
 * Habitat training intentionally ships dark. Setting the public environment
 * variable to "true" exposes the prepared room state without coupling storage
 * access to unfinished astronaut-training mechanics.
 */
export const FEATURE_FLAGS = Object.freeze({
  subsurfaceHabitatTraining:
    process.env.NEXT_PUBLIC_FEATURE_SUBSURFACE_HABITAT_TRAINING === 'true',
  // The Scan Station mechanic is Sprint 12 work (STS-618). Keep the prepared
  // screen/code dark in Sprint 11 so an old save cannot make an unbuilt,
  // non-functional scanner appear on Earth Base.
  scanStation:
    process.env.NEXT_PUBLIC_FEATURE_SCAN_STATION === 'true',
})
