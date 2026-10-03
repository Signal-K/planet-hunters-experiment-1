// Fail a staging/production Worker build whose client or server bundle
// still constructs PocketBase requests with a loopback URL, or never
// mentions the Fly hosts. The resolver may still receive loopback strings
// as inputs; those are fine when NEXT_PUBLIC_LANDNAM_ENV selects the Fly
// host before the request is sent. See SSL-439.

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(process.argv[2] ?? '.open-next')
const required = [
  'https://signal-k-starsailors.fly.dev',
  'https://signal-k-landnam.fly.dev',
]
// The resolver may still mention the loopback strings as inputs. These
// patterns are the broken staging bundle: a PocketBase client or fetch
// built with the docker URL itself, not passed through the resolver.
const forbidden = [
  /new [A-Za-z0-9_.$]+\("http:\/\/localhost:809/,
  /\$\{"http:\/\/localhost:809/,
  /\?\? "http:\/\/localhost:8091"/,
]

async function jsFiles(dir, out = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err && err.code === 'ENOENT') return out
    throw err
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'cache') continue
      await jsFiles(full, out)
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full)
    }
  }
  return out
}

const info = await stat(root).catch(() => null)
if (!info) {
  console.error(`verify-deployed-pb-urls: ${root} does not exist`)
  process.exit(1)
}

const files = await jsFiles(root)
let corpus = ''
for (const file of files) {
  corpus += await readFile(file, 'utf8')
  corpus += '\n'
}

const missing = required.filter(url => !corpus.includes(url))
const hits = forbidden.filter(pattern => pattern.test(corpus))

if (missing.length === 0 && hits.length === 0) {
  console.log(`verify-deployed-pb-urls: ${files.length} js files under ${root} reference the Fly PocketBase hosts`)
  process.exit(0)
}

console.error('verify-deployed-pb-urls: this Worker build would ship a broken data link.')
if (missing.length > 0) {
  console.error(`  missing ${missing.join(', ')}`)
}
for (const pattern of hits) {
  console.error(`  matched ${pattern}`)
}
console.error('  Set NEXT_PUBLIC_SHARED_PB_URL and NEXT_PUBLIC_LANDNAM_PB_URL to the Fly hosts, and NEXT_PUBLIC_LANDNAM_ENV to staging or production, before opennextjs-cloudflare build.')
process.exit(1)
