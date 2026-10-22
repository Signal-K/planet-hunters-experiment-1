// `node scripts/authoring.mjs <command>`: compile, check, validate. The same code the Scene Studio and CI use.
import { pathToFileURL } from 'node:url'
import { compileAll } from './compile.ts'
import { formatDiagnostic } from './validate.ts'

const HELP = `Landnam authoring (shared/authoring/*.toml)

  compile    Validate every source, then write the runtime files web and native load.
  check      Same, but write nothing. Fails on any error or any stale runtime file. Used by CI.
  validate   Print every problem with file, line and column. Writes nothing.

Run from the repo root:  node scripts/authoring.mjs check     (or: cd web && npm run authoring:check)`

export function main(argv: string[], root: string): number {
  const command = argv[0] ?? 'check'
  if (!['compile', 'check', 'validate'].includes(command)) {
    console.log(HELP)
    return command === 'help' || command === '--help' ? 0 : 1
  }
  const result = compileAll({ root, write: command === 'compile' })
  const errors = result.diagnostics.filter(d => d.severity === 'error')
  const warnings = result.diagnostics.filter(d => d.severity === 'warning')
  for (const d of [...errors, ...warnings]) console.log(formatDiagnostic(d))

  if (command !== 'validate') {
    for (const file of result.files) {
      const mark = file.status === 'current' ? '  ok     ' : file.status === 'written' ? '  wrote  ' : '  STALE  '
      console.log(`${mark}${file.path}   <- ${file.sources.map(s => s.replace('shared/authoring/', '')).join(', ')}`)
    }
  }
  const stale = result.files.filter(f => f.status === 'stale')
  console.log(`${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}, ${stale.length} stale`)
  if (stale.length) console.log('Run `node scripts/authoring.mjs compile` (or `cd web && npm run authoring:compile`) to refresh the runtime files.')
  return result.ok ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2), process.env.LANDNAM_REPO_ROOT ?? process.cwd()))
}
