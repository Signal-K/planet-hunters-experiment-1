// Vitest follows static imports transitively. Fall back to all tests for shared,
// configuration, deleted or non-code files whose dependencies are less certain.
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const files = JSON.parse(process.env.CHANGED_WEB_FILES || '[]').map(f => f.replace(/^web\//, ''))
const code = /\.(?:[cm]?[jt]sx?)$/
const full = process.env.FULL_TESTS === 'true' || files.length === 0 || files.some(f =>
  !code.test(f) || !existsSync(f) || /(^|\/)(?:vitest\.config|next\.config|middleware|instrumentation|setup)(?:\.|\/)/.test(f),
)
const args = full ? ['vitest', 'run'] : ['vitest', 'related', '--run', '--passWithNoTests', ...files]
console.log(`CI web tests: ${full ? 'full suite' : `related to ${files.join(', ')}`}`)
const result = spawnSync('npx', args, { stdio: 'inherit' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
