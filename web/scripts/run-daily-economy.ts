#!/usr/bin/env node

/**
 * Narrow scheduler adapter for DailyEconomySystem.
 *
 * The caller supplies the authoritative input JSON (including the most recent
 * published snapshot when present). The script never contacts a service or
 * starts Docker; persistence is deliberately owned by the job's configured
 * event/snapshot adapter until the shared ledger has a production home.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { aestDateKey, resolveDailyEconomy, type DailyEconomyInput, type DateKey } from '../lib/systems/DailyEconomySystem.ts'

interface Arguments {
  inputPath?: string
  outputPath?: string
  snapshotDate?: DateKey
  publishUrl?: string
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2))
  const raw = args.inputPath
    ? await readFile(args.inputPath, 'utf8')
    : process.env.LANDNAM_DAILY_ECONOMY_INPUT_JSON
  if (!raw) {
    throw new Error('Set LANDNAM_DAILY_ECONOMY_INPUT_JSON or pass --input <path>; refusing to publish an empty daily economy snapshot.')
  }
  const input = JSON.parse(raw) as DailyEconomyInput
  // Scheduled runs own the AEST snapshot date. `--date` makes missed-run
  // recovery and deterministic local replay explicit without relying on a
  // runner's local timezone.
  const snapshot = resolveDailyEconomy({ ...input, snapshotDate: args.snapshotDate ?? aestDateKey() })
  const output = `${JSON.stringify(snapshot, null, 2)}\n`
  if (args.outputPath) {
    await writeFile(args.outputPath, output, 'utf8')
  }
  if (args.publishUrl) await publishSnapshot(args.publishUrl, snapshot)
  if (!args.outputPath) process.stdout.write(output)
}

async function publishSnapshot(baseUrl: string, snapshot: ReturnType<typeof resolveDailyEconomy>): Promise<void> {
  const email = process.env.LANDNAM_PB_SERVICE_EMAIL
  const password = process.env.LANDNAM_PB_SERVICE_PASSWORD
  if (!email || !password) {
    throw new Error('Set LANDNAM_PB_SERVICE_EMAIL and LANDNAM_PB_SERVICE_PASSWORD before publishing a daily economy snapshot.')
  }
  const base = baseUrl.replace(/\/$/, '')
  const authResponse = await fetch(`${base}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  })
  if (!authResponse.ok) throw new Error(`Daily economy service authentication failed: ${authResponse.status}`)
  const auth = await authResponse.json() as { token?: unknown }
  if (typeof auth.token !== 'string' || auth.token.length === 0) throw new Error('Daily economy service authentication returned no token.')
  const headers = { authorization: auth.token, 'content-type': 'application/json' }
  const filter = encodeURIComponent(`idempotency_key = "${snapshot.idempotencyKey}"`)
  const existingResponse = await fetch(`${base}/api/collections/daily_economy_snapshots/records?filter=${filter}&perPage=1`, { headers })
  if (!existingResponse.ok) throw new Error(`Daily economy snapshot lookup failed: ${existingResponse.status}`)
  const existing = await existingResponse.json() as { items?: Array<{ id?: unknown }> }
  const recordId = existing.items?.[0]?.id
  const body = JSON.stringify({
    snapshot_date: snapshot.snapshotDate,
    idempotency_key: snapshot.idempotencyKey,
    snapshot,
  })
  const response = await fetch(
    typeof recordId === 'string' && recordId.length > 0
      ? `${base}/api/collections/daily_economy_snapshots/records/${recordId}`
      : `${base}/api/collections/daily_economy_snapshots/records`,
    { method: typeof recordId === 'string' && recordId.length > 0 ? 'PATCH' : 'POST', headers, body }
  )
  if (!response.ok) throw new Error(`Daily economy snapshot publish failed: ${response.status}`)
}

function parseArguments(args: readonly string[]): Arguments {
  const parsed: Arguments = {}
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index]
    const value = args[index + 1]
    if ((option === '--input' || option === '--output' || option === '--date' || option === '--publish-url') && value) {
      if (option === '--input') parsed.inputPath = value
      else if (option === '--output') parsed.outputPath = value
      else if (option === '--date') parsed.snapshotDate = value as DateKey
      else parsed.publishUrl = value
      index += 1
      continue
    }
    throw new Error(`Unknown or incomplete argument: ${option}`)
  }
  return parsed
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`Daily economy job failed: ${message}\n`)
  process.exitCode = 1
})
