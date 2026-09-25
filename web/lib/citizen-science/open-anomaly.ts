/**
 * Shared open-anomaly rules for the citizen-science pool.
 *
 * One consensus lives on the shared PocketBase row (`consensus` / `gold_label`).
 * Games never keep a local settled store — they only serve rows that are still
 * open (unset or below threshold). See SSL-323.
 */

export const TESS_SETTLED_LABELS = ['planet', 'not_planet'] as const
export const ASTEROID_SETTLED_LABELS = ['likely_real', 'likely_artifact'] as const
const OPEN_CONSENSUS_LABELS = ['', 'unsure'] as const

export type SettledLabel = (typeof TESS_SETTLED_LABELS)[number] | (typeof ASTEROID_SETTLED_LABELS)[number]

function readAnomalyLabel(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

export function isOpenConsensusValue(
  value: unknown,
  settledLabels: readonly string[],
): boolean {
  const label = readAnomalyLabel(value)
  if ((OPEN_CONSENSUS_LABELS as readonly string[]).includes(label)) return true
  return !settledLabels.includes(label)
}

export function isSettledConsensusValue(
  value: unknown,
  settledLabels: readonly string[],
): boolean {
  return !isOpenConsensusValue(value, settledLabels)
}

export function recordHasOpenConsensus(
  record: Record<string, unknown> | null | undefined,
  settledLabels: readonly string[],
): boolean {
  if (!record) return false
  return isOpenConsensusValue(record.consensus, settledLabels)
    && isOpenConsensusValue(record.gold_label, settledLabels)
}

/**
 * PocketBase filter for TESS `subjects`. `gold_label` / `consensus` exist on
 * the live shared collection. Do not sort this query on `created` — that
 * field is not defined (SSL-10).
 */
export const REVIEWABLE_TESS_SUBJECT_FILTER = [
  'subject_type = "transit"',
  'gold_label = ""',
  '(consensus = "" || consensus = "unsure")',
].join(' && ')

export const TESS_SUBJECT_SORT = 'id'

/**
 * PocketBase filter for NEOCP `asteroid_candidates`.
 *
 * Live shared PocketBase (2026-09-19): `resolved` exists; `consensus` and
 * `gold_label` do **not**. Filtering on those missing fields is a 400 — the
 * same class of bug as SSL-10. Open-only consensus is enforced client-side
 * (`isReviewableAsteroidCandidate`) so a later schema add still hides settled
 * rows without breaking today's feed.
 */
export const REVIEWABLE_ASTEROID_CANDIDATE_FILTER = 'resolved = false'
export const ASTEROID_CANDIDATE_SORT = '-created'
