import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { editorArgs, editorCommands, openInEditor, planOpen, repoRelative } from './open-editor.ts'
import { parseCursorHref } from './open-href.ts'
import { scriptHref } from './studio-model.ts'

let root = ''
let outside = ''

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'landnam-open-'))
  outside = mkdtempSync(join(tmpdir(), 'landnam-outside-'))
  for (const dir of ['shared/authoring/scenes', 'shared/authoring/feedback', 'web/node_modules/pkg', '.git']) mkdirSync(join(root, dir), { recursive: true })
  writeFileSync(join(root, 'shared/authoring/scenes/hub.toml'), 'id = "hub"\n')
  writeFileSync(join(root, '.env'), 'SECRET=1\n')
  writeFileSync(join(root, '.git/config'), '')
  writeFileSync(join(root, 'web/node_modules/pkg/index.js'), '')
  writeFileSync(join(outside, 'secret.txt'), 'nope')
  symlinkSync(join(outside, 'secret.txt'), join(root, 'shared/authoring/scenes/link.toml'))
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

describe('planOpen', () => {
  it('opens a repo file at a line', () => {
    const plan = planOpen(root, { file: 'shared/authoring/scenes/hub.toml', line: 12 })
    expect(plan).toEqual({ ok: true, target: { file: 'shared/authoring/scenes/hub.toml', path: join(root, 'shared/authoring/scenes/hub.toml'), line: 12, column: 1 } })
  })

  it('accepts an absolute path under the repo and makes it repo-relative', () => {
    const plan = planOpen(root, { file: join(root, 'shared/authoring/scenes/hub.toml') })
    expect(plan.ok && plan.target.file).toBe('shared/authoring/scenes/hub.toml')
  })

  it('drops a line that is not a whole number of at least 1', () => {
    for (const line of [0, -3, 2.5, Number.NaN, '7' as unknown as number]) {
      const plan = planOpen(root, { file: 'shared/authoring/scenes/hub.toml', line })
      expect(plan.ok && plan.target.line).toBeUndefined()
    }
  })

  it('refuses anything outside the repo', () => {
    for (const file of ['../etc/passwd', '/etc/passwd', 'shared/../../etc/passwd', join(outside, 'secret.txt')]) {
      expect(planOpen(root, { file })).toEqual({ ok: false, message: 'That file is outside the repo.' })
    }
  })

  it('refuses a symlink that leaves the repo', () => {
    expect(planOpen(root, { file: 'shared/authoring/scenes/link.toml' })).toEqual({ ok: false, message: 'That file is outside the repo.' })
  })

  it('refuses hidden files, installed packages and folders', () => {
    for (const file of ['.env', '.git/config', 'web/node_modules/pkg/index.js']) {
      expect(planOpen(root, { file })).toEqual({ ok: false, message: 'The Studio does not open that kind of file.' })
    }
    expect(planOpen(root, { file: 'shared/authoring/scenes' })).toEqual({ ok: false, message: 'That is a folder, not a file.' })
  })

  it('refuses empty, oversized and NUL paths', () => {
    for (const file of ['', 'a'.repeat(401), 'shared/authoring/scenes/hub.toml\0.png']) {
      expect(planOpen(root, { file })).toEqual({ ok: false, message: 'Say which file to open.' })
    }
  })

  it('lets the editor create an authoring file that is not there yet, and nothing else', () => {
    expect(planOpen(root, { file: 'shared/authoring/feedback/new-scene.toml' }).ok).toBe(true)
    expect(planOpen(root, { file: 'shared/authoring/nowhere/new.toml' })).toEqual({ ok: false, message: 'That file does not exist.' })
    expect(planOpen(root, { file: 'web/app/new.tsx' })).toEqual({ ok: false, message: 'That file does not exist.' })
  })
})

describe('repoRelative', () => {
  it('strips the first matching root and leaves relative paths alone', () => {
    expect(repoRelative('/Users/me/Landnam/a/b.toml', [undefined, '/repo', '/Users/me/Landnam/'])).toBe('a/b.toml')
    expect(repoRelative('/repo/a/b.toml', ['/Users/me/Landnam', '/repo'])).toBe('a/b.toml')
    expect(repoRelative('a/b.toml', ['/repo'])).toBe('a/b.toml')
    expect(repoRelative('/elsewhere/a.toml', ['/repo'])).toBeNull()
    expect(repoRelative('/repository/a.toml', ['/repo'])).toBeNull()
  })
})

describe('the editor command line', () => {
  it('reuses the open window and goes to the line', () => {
    expect(editorArgs({ file: 'a', path: '/r/a', line: 4, column: 2 })).toEqual(['--reuse-window', '--goto', '/r/a:4:2'])
    expect(editorArgs({ file: 'a', path: '/r/a' })).toEqual(['--reuse-window', '--goto', '/r/a'])
  })

  it('uses only LANDNAM_EDITOR when it is set, and Cursor otherwise', () => {
    expect(editorCommands({ LANDNAM_EDITOR: '/x/editor' })).toEqual(['/x/editor'])
    expect(editorCommands({})[0]).toBe('/usr/local/bin/cursor')
  })
})

describe('openInEditor with a stand-in editor', () => {
  const script = (name: string, body: string) => {
    const file = join(root, name)
    writeFileSync(file, `#!/bin/sh\n${body}\n`)
    chmodSync(file, 0o755)
    return file
  }
  const target = { file: 'shared/authoring/scenes/hub.toml', path: '/r/hub.toml', line: 9, column: 1 }

  it('passes the arguments and reports success', async () => {
    const record = join(root, 'args.txt')
    const editor = script('ok.sh', `printf '%s\\n' "$@" > "${record}"`)
    expect(await openInEditor(target, { commands: [editor] })).toEqual({ ok: true, command: editor })
    expect(readFileSync(record, 'utf8').trim().split('\n')).toEqual(['--reuse-window', '--goto', '/r/hub.toml:9:1'])
  })

  it('reports a command that fails, with what it said', async () => {
    const editor = script('fail.sh', 'echo "no window" >&2; exit 3')
    expect(await openInEditor(target, { commands: [editor] })).toEqual({ ok: false, message: `The editor command (${editor}) failed: no window.` })
  })

  it('moves on from a missing command and says so when none exist', async () => {
    const editor = script('second.sh', 'exit 0')
    expect(await openInEditor(target, { commands: [join(root, 'missing'), editor] })).toEqual({ ok: true, command: editor })
    const none = await openInEditor(target, { commands: [join(root, 'missing')] })
    expect(none.ok).toBe(false)
  })

  it('treats an editor still running after the wait as having taken the file', async () => {
    const editor = script('slow.sh', 'sleep 5')
    expect(await openInEditor(target, { commands: [editor], waitMs: 150 })).toEqual({ ok: true, command: editor })
  })
})

describe('parseCursorHref', () => {
  it('reads the path, line and column', () => {
    expect(parseCursorHref('cursor://file/Users/me/Landnam/shared/authoring/scenes/hub.toml:12:1')).toEqual({ file: '/Users/me/Landnam/shared/authoring/scenes/hub.toml', line: 12, column: 1 })
    expect(parseCursorHref('cursor://file/Users/me/Landnam/a.toml')).toEqual({ file: '/Users/me/Landnam/a.toml', line: undefined, column: undefined })
    expect(parseCursorHref('https://example.com/a.toml')).toBeNull()
  })

  it('reads back what scriptHref writes', () => {
    expect(parseCursorHref(scriptHref('/Users/me/Landnam', 'shared/authoring/scenes/hub.toml', 40))).toEqual({ file: '/Users/me/Landnam/shared/authoring/scenes/hub.toml', line: 40, column: 1 })
    expect(parseCursorHref(scriptHref('/Users/me/Landnam/', 'a/b.toml'))?.file).toBe('/Users/me/Landnam/a/b.toml')
  })
})
