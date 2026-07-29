import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scope = 'signal-k'
const alias = 'landnam-test.vercel.app'
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const output = execFileSync('vercel', ['deploy', '--yes', '--scope', scope], {
  cwd: projectRoot,
  encoding: 'utf8',
  stdio: ['inherit', 'pipe', 'inherit'],
})
process.stdout.write(output)

const deployment = output.match(/Preview:\s+(https:\/\/[^\s]+)/)?.[1]
  ?? output.match(/"url":\s*"(https:\/\/[^\"]+)"/)?.[1]
if (!deployment) {
  throw new Error('Could not find the Vercel preview URL in deploy output')
}

execFileSync('vercel', ['alias', 'set', deployment, alias, '--scope', scope], {
  cwd: projectRoot,
  stdio: 'inherit',
})
