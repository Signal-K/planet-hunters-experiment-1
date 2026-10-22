import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createOpener, helperVersion } from './host-opener.ts'

let root = ''
let record = ''
let base = ''
let server: ReturnType<typeof createOpener>

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'landnam-helper-'))
  mkdirSync(join(root, 'shared/authoring/scenes'), { recursive: true })
  writeFileSync(join(root, 'shared/authoring/scenes/hub.toml'), 'id = "hub"\n')
  record = join(root, 'args.txt')
  const editor = join(root, 'editor.sh')
  writeFileSync(editor, `#!/bin/sh\nprintf '%s\\n' "$@" > "${record}"\n`)
  chmodSync(editor, 0o755)
  // Only the stand-in editor is ever tried, so a test can never open the real one.
  server = createOpener({ root, commands: [editor] })
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
  rmSync(root, { recursive: true, force: true })
})

const post = (body: unknown, headers: Record<string, string> = { 'Content-Type': 'application/json' }) =>
  fetch(`${base}/open`, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) })

describe('the Cursor helper', () => {
  it('says it is up, which version it is and which repo it serves', async () => {
    const health = await (await fetch(`${base}/health`)).json()
    expect(health).toEqual({ ok: true, version: helperVersion(), root })
    expect(helperVersion()).toMatch(/^[0-9a-f]{8}$/)
  })

  it('opens a file at a line with the editor command', async () => {
    const res = await post({ file: 'shared/authoring/scenes/hub.toml', line: 7 })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, file: 'shared/authoring/scenes/hub.toml', line: 7 })
    expect(readFileSync(record, 'utf8').trim().split('\n')).toEqual(['--reuse-window', '--goto', `${join(root, 'shared/authoring/scenes/hub.toml')}:7:1`])
  })

  it('refuses a path outside the repo and a hidden file', async () => {
    for (const file of ['../../etc/passwd', '/etc/passwd', '.env']) {
      const res = await post({ file })
      expect(res.status).toBe(400)
      expect(await res.json()).toMatchObject({ ok: false, reason: 'bad-request' })
    }
  })

  it('answers only JSON, and never a request that came from a web page', async () => {
    expect((await post('{"file":"shared/authoring/scenes/hub.toml"}', { 'Content-Type': 'text/plain' })).status).toBe(415)
    const fromPage = await post({ file: 'shared/authoring/scenes/hub.toml' }, { 'Content-Type': 'application/json', Origin: 'https://example.com' })
    expect(fromPage.status).toBe(403)
  })

  it('treats a broken body as a bad request, not a crash', async () => {
    const res = await post('{not json')
    expect(res.status).toBe(400)
    expect((await fetch(`${base}/open`)).status).toBe(404)
  })
})
