// `.vercelignore` uses .gitignore matching semantics, which means a bare
// `foo/` pattern excludes a `foo` directory at ANY depth — not just at the
// repo root where it was aimed.
//
// That happened: a retired Godot-era block carried a bare `scene/` entry, and
// the moment KES-260 added `web/lib/scene/` for the terrain kit, those two
// files were stripped from the Vercel upload. Local builds passed (the files
// are on disk and committed), CI passed, and only the Vercel build failed —
// with "Module not found: Can't resolve '@/lib/scene/compositions'", which
// reads like an alias bug rather than a missing-file bug.
//
// This asserts the deploy upload still contains every tracked source file the
// app is built from. It is the cheap version of noticing a red deployment.

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = join(process.cwd(), '..')
const IGNORE_FILE = join(REPO_ROOT, '.vercelignore')

/**
 * Directories whose contents must survive into the deployment. Anything the
 * running app imports or serves belongs here. Deliberately omits `web/cypress`
 * and other test/CI trees, which `.vercelignore` is *supposed* to drop.
 */
const MUST_SHIP = [
  'web/app/',
  'web/components/',
  'web/lib/',
  'web/public/',
]

/** Test and story files inside MUST_SHIP dirs that need not reach production. */
const NOT_REQUIRED = /\.(test|spec)\.[jt]sx?$/

function patterns(): string[] {
  return readFileSync(IGNORE_FILE, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
}

function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '--', 'web/'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
}

/** Mirrors .gitignore semantics for the pattern shapes this file actually uses. */
function excludes(pattern: string, filePath: string): boolean {
  const rooted = pattern.startsWith('/')
  const body = (rooted ? pattern.slice(1) : pattern).replace(/\/$/, '')
  if (body.includes('*')) return false // no globs in play; keep the guard honest
  if (rooted) return filePath === body || filePath.startsWith(`${body}/`)
  const segments = filePath.split('/')
  const depth = body.split('/').length
  for (let i = 0; i + depth <= segments.length; i++) {
    if (segments.slice(i, i + depth).join('/') === body) return true
  }
  return false
}

describe('.vercelignore', () => {
  it('does not strip any source file the app is built from', () => {
    const pats = patterns()
    const required = trackedFiles().filter(
      f => MUST_SHIP.some(dir => f.startsWith(dir)) && !NOT_REQUIRED.test(f),
    )
    expect(required.length).toBeGreaterThan(0)

    const stripped = required
      .flatMap(file => pats.filter(p => excludes(p, file)).map(p => `${file}  (matched by "${p}")`))
      .slice(0, 20)

    expect(stripped).toEqual([])
  })

  it('still excludes the test and build trees it is meant to', () => {
    const pats = patterns()
    for (const path of ['web/cypress/e2e/foo.cy.ts', 'web/coverage/index.html', 'node_modules/react/index.js']) {
      expect({ path, excluded: pats.some(p => excludes(p, path)) }).toEqual({ path, excluded: true })
    }
  })

  it('anchors top-level-only patterns with a leading slash', () => {
    // A bare pattern is a depth-matching landmine; if a pattern names a
    // directory that only ever exists at the repo root, it must be anchored.
    const topLevelOnly = ['android', 'ios', 'electron', 'electron-dist']
    for (const name of topLevelOnly) {
      expect({ name, anchored: patterns().includes(`/${name}/`) }).toEqual({ name, anchored: true })
    }
  })
})
