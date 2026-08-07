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
  // Shipped Sprint 12 (KES-129, decided 2026-08-07) after sitting dark since
  // Sprint 11 (STS-618) — flag kept as a rollback switch, not because the
  // mechanic is unfinished.
  scanStation:
    process.env.NEXT_PUBLIC_FEATURE_SCAN_STATION === 'true',
})
