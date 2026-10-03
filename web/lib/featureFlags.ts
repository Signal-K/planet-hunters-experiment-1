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
  /**
   * Cycle 3 keeps off-world construction focused on the mining loop. The
   * deferred exploration, settlement, and creative entries remain in their
   * registries so they can be restored without migrating player data.
   */
  offworldNonMiningBuilds:
    process.env.NEXT_PUBLIC_FEATURE_OFFWORLD_NON_MINING_BUILDS === 'true',
})

export type OffworldBuildCategory = 'mining' | 'exploration' | 'settlements' | 'creative'

/** Mining is the default Cycle 3 field/build-contract scope. */
export function isOffworldBuildVisible(
  category: OffworldBuildCategory,
  includeNonMining = FEATURE_FLAGS.offworldNonMiningBuilds,
): boolean {
  return category === 'mining' || includeNonMining
}
