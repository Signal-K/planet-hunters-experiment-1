#!/usr/bin/env node

/**
 * Narrow scheduler adapter for DailyEconomySystem.
 *
 * With `--publish-url`, the input is read from PocketBase: every saved game's
 * client-build events plus the latest published snapshot, combined with the
 * game's client and mineral catalogs. `--input` or
 * LANDNAM_DAILY_ECONOMY_INPUT_JSON overrides that for offline replay.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { aestDateKey, resolveDailyEconomy, type DailyEconomyInput, type DailyEconomySnapshot, type DateKey } from '../lib/systems/DailyEconomySystem.ts'
import { buildDailyEconomyInput } from '../lib/systems/DailyEconomyInput.ts'

interface Arguments {
  inputPath?: string
  outputPath?: string
  snapshotDate?: DateKey
  publishUrl?: string
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2))
  const snapshotDate = args.snapshotDate ?? aestDateKey()
  const pb = args.publishUrl ? await connect(args.publishUrl) : null
  const raw = args.inputPath
    ? await readFile(args.inputPath, 'utf8')
    : process.env.LANDNAM_DAILY_ECONOMY_INPUT_JSON
  let input: DailyEconomyInput
  if (raw) input = JSON.parse(raw) as DailyEconomyInput
  else if (pb) input = await loadInput(pb, snapshotDate)
  else throw new Error('Pass --publish-url, --input <path>, or set LANDNAM_DAILY_ECONOMY_INPUT_JSON; refusing to publish an empty daily economy snapshot.')
  // Scheduled runs own the AEST snapshot date. `--date` makes missed-run
  // recovery and deterministic local replay explicit without relying on a
  // runner's local timezone.
  const snapshot = resolveDailyEconomy({ ...input, snapshotDate })
  const output = `${JSON.stringify(snapshot, null, 2)}\n`
  if (args.outputPath) {
    await writeFile(args.outputPath, output, 'utf8')
  }
  if (pb) await publishSnapshot(pb, snapshot)
  if (!args.outputPath) process.stdout.write(output)
  const builds = snapshot.completedBuildEventIds.length
  process.stderr.write(`Daily economy ${snapshot.snapshotDate}: ${snapshot.clients.length} clients, ${Object.keys(snapshot.prices).length} prices, ${builds} new client builds.\n`)
}

interface PocketBase {
  base: string
  headers: Record<string, string>
}

async function connect(baseUrl: string): Promise<PocketBase> {
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
  return { base, headers: { authorization: auth.token, 'content-type': 'application/json' } }
}

async function loadInput(pb: PocketBase, snapshotDate: DateKey): Promise<DailyEconomyInput> {
  const latestResponse = await fetch(`${pb.base}/api/collections/daily_economy_snapshots/records?sort=-snapshot_date&perPage=1`, { headers: pb.headers })
  if (!latestResponse.ok) throw new Error(`Daily economy snapshot lookup failed: ${latestResponse.status}`)
  const latest = await latestResponse.json() as { items?: Array<{ snapshot?: DailyEconomySnapshot }> }
  const savedStates: unknown[] = []
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${pb.base}/api/collections/game_states/records?page=${page}&perPage=200&fields=state&skipTotal=1`, { headers: pb.headers })
    if (!response.ok) throw new Error(`Daily economy game state lookup failed: ${response.status}`)
    const body = await response.json() as { items?: Array<{ state?: unknown }> }
    const items = body.items ?? []
    for (const item of items) savedStates.push(typeof item.state === 'string' ? JSON.parse(item.state) : item.state)
    if (items.length < 200) break
  }
  return buildDailyEconomyInput({ snapshotDate, savedStates, publishedSnapshot: latest.items?.[0]?.snapshot })
}

async function publishSnapshot(pb: PocketBase, snapshot: ReturnType<typeof resolveDailyEconomy>): Promise<void> {
  const { base, headers } = pb
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
