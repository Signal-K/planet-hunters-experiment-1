#!/usr/bin/env node

import { writeFileSync } from 'node:fs'
import { CLIENT_SLOTS } from '../lib/data/clients.ts'
import { MINERAL_META } from '../lib/data/minerals.ts'
import {
  DEFAULT_MISSION_TEMPLATES,
  generateFreeOpsMissionsFromRules,
  generateMissionsFromRules,
  missionTemplatesToPocketBaseRows,
  missionsToPocketBaseRows,
  type PocketBaseMissionSeed,
  type PocketBaseMissionTemplateSeed,
} from '../lib/data/mission-generator.ts'

type OutputKind = 'templates' | 'generated' | 'freeops' | 'all'
type OutputFormat = 'summary' | 'json'

interface Options {
  kind: OutputKind
  format: OutputFormat
  out?: string
}

interface MissionGeneratorOutputs {
  templates?: PocketBaseMissionTemplateSeed[]
  generated?: PocketBaseMissionSeed[]
  freeops?: PocketBaseMissionSeed[]
}

function parseArgs(argv: string[]): Options {
  const options: Options = { kind: 'all', format: 'summary' }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    if (arg === '--kind') {
      options.kind = requireValue<OutputKind>(arg, argv[++i], ['templates', 'generated', 'freeops', 'all'])
      continue
    }
    if (arg === '--format') {
      options.format = requireValue<OutputFormat>(arg, argv[++i], ['summary', 'json'])
      continue
    }
    if (arg === '--out') {
      options.out = argv[++i]
      if (!options.out) throw new Error('--out requires a file path')
      continue
    }
    throw new Error(`Unknown option: ${arg}`)
  }
  return options
}

function requireValue<T extends string>(flag: string, value: string | undefined, allowed: T[]): T {
  if (!value || !allowed.includes(value as T)) {
    throw new Error(`${flag} must be one of: ${allowed.join(', ')}`)
  }
  return value as T
}

function printHelp() {
  console.log(`Usage: npm run missions:emit -- [options]

Deterministically emits Landnam mission generator outputs. No AI calls.

Options:
  --kind templates|generated|freeops|all   Output group to emit (default: all)
  --format summary|json                    Output format (default: summary)
  --out <path>                             Write output to a file instead of stdout
  -h, --help                               Show this help

Examples:
  npm run missions:emit
  npm run missions:emit -- --kind freeops --format json
  npm run missions:emit -- --format json --out /tmp/landnam-missions.json`)
}

function buildOutputs(kind: OutputKind): MissionGeneratorOutputs {
  const generated = generateMissionsFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META })
  const freeops = generateFreeOpsMissionsFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META })
  const outputs = {
    templates: missionTemplatesToPocketBaseRows(DEFAULT_MISSION_TEMPLATES),
    generated: missionsToPocketBaseRows(generated),
    freeops: missionsToPocketBaseRows(freeops),
  }
  if (kind === 'all') return outputs
  return { [kind]: outputs[kind] }
}

function summarize(outputs: MissionGeneratorOutputs): string {
  const lines = ['Landnam mission generator output']
  if (outputs.templates) lines.push(`- templates: ${outputs.templates.length}`)
  if (outputs.generated) lines.push(`- generated fallback missions: ${outputs.generated.length}`)
  if (outputs.freeops) {
    lines.push(`- free ops offers: ${outputs.freeops.length}`)
    const byClient = outputs.freeops.reduce<Record<string, number>>((acc, mission) => {
      acc[mission.client_slug] = (acc[mission.client_slug] ?? 0) + 1
      return acc
    }, {})
    for (const [client, count] of Object.entries(byClient)) {
      lines.push(`  - ${client}: ${count}`)
    }
  }
  return `${lines.join('\n')}\n`
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const outputs = buildOutputs(options.kind)
  const rendered = options.format === 'json'
    ? `${JSON.stringify(outputs, null, 2)}\n`
    : summarize(outputs)
  if (options.out) {
    writeFileSync(options.out, rendered)
    console.log(`Wrote ${options.out}`)
  } else {
    process.stdout.write(rendered)
  }
}

main()
