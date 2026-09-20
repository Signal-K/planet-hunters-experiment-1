/**
 * Staging / playtest identities.
 *
 * Landnam still authenticates through shared PocketBase (not Clerk). The
 * Clerk-style "skip verification on a staging account" behaviour maps here:
 * `@landnam.test` addresses are IANA-reserved (RFC 2606), never a real player,
 * and may be created without an email verification round-trip, then deleted
 * with their game_states after a cycle playthrough.
 */
export const STAGING_PLAYTEST_EMAIL_SUFFIX = '@landnam.test'

export function isStagingDeploy(): boolean {
  const deployEnv = process.env.NEXT_PUBLIC_LANDNAM_ENV ?? process.env.NEXT_PUBLIC_DEPLOY_ENV
  if (deployEnv === 'production') return false
  if (deployEnv === 'staged' || deployEnv === 'staging' || deployEnv === 'preview') return true
  return process.env.NODE_ENV !== 'production'
}

export function isStagingPlaytestAccount(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(STAGING_PLAYTEST_EMAIL_SUFFIX)
}

/** Fields that skip the verification gate for a staging playtest signup. */
export function stagingSignupFields(email: string): Record<string, unknown> {
  if (!isStagingPlaytestAccount(email) || !isStagingDeploy()) return {}
  return { verified: true, emailVisibility: true }
}
