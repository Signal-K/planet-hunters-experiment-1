#!/usr/bin/env node

/**
 * SSL-323 — one scheduled ingest into the shared PocketBase citizen-science
 * pool (not Landnam PocketBase, not a per-game runner).
 *
 * Sources (public, no API key):
 *   - NASA Exoplanet Archive TAP `toi` table (open PC/APC only)
 *   - Minor Planet Center NEOCP JSON
 *
 * Writes (when admin credentials are present):
 *   - subjects (TESS) with empty consensus/gold_label
 *   - asteroid_candidates (NEOCP) with resolved=false
 *
 * Never updates or deletes existing rows. Never invents a Spectra ingest.
 *
 * Required to actually write (GitHub Actions secrets / local env):
 *   SHARED_PB_URL or PB_STARSAILORS_URL   default https://signal-k-starsailors.fly.dev
 *   SHARED_PB_ADMIN_EMAIL or PB_ADMIN_EMAIL
 *   SHARED_PB_ADMIN_PASSWORD or PB_ADMIN_PASSWORD
 *
 * Optional:
 *   INGEST_TESS_LIMIT   default 25
 *   INGEST_NEOCP_LIMIT  default 25
 *   INGEST_DRY_RUN=1    force plan-only even if credentials exist
 *
 * Without admin credentials the job fetches the public sources, prints a
 * dry-run plan, and exits 0 — it does not fake a live write.
 */

import { resolveIngestEnv, runSharedSubjectIngest } from '../lib/citizen-science/ingest/run.ts'

function parseArgs(args: readonly string[]): { dryRun: boolean } {
  return { dryRun: args.includes('--dry-run') }
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs(process.argv.slice(2))
  const env = resolveIngestEnv()
  if (dryRun) env.write = false

  const result = await runSharedSubjectIngest({ env })
  const summary = {
    mode: result.mode,
    written: result.written,
    skippedWriteReason: result.skippedWriteReason,
    tessInserted: result.plan.tessInserted.map(row => row.identity),
    neocpInserted: result.plan.neocpInserted.map(row => row.identity),
    tessSkippedExisting: result.plan.tessSkippedExisting,
    tessSkippedSettled: result.plan.tessSkippedSettled,
    tessSkippedClosedSource: result.plan.tessSkippedClosedSource,
    neocpSkippedExisting: result.plan.neocpSkippedExisting,
    neocpSkippedSettled: result.plan.neocpSkippedSettled,
    notes: result.plan.notes,
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`Shared subject ingest failed: ${message}\n`)
  process.exitCode = 1
})
