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
    return
  }
  process.stdout.write(output)
}

function parseArguments(args: readonly string[]): Arguments {
  const parsed: Arguments = {}
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index]
    const value = args[index + 1]
    if ((option === '--input' || option === '--output' || option === '--date') && value) {
      if (option === '--input') parsed.inputPath = value
      else if (option === '--output') parsed.outputPath = value
      else parsed.snapshotDate = value as DateKey
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
