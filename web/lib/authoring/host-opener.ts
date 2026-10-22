// The Cursor helper: a tiny server on the host machine that opens files in the editor for the Studio. The dev server runs in
// Docker and cannot launch an app on the host, and Cursor's built-in browser will not follow cursor:// links, so the Studio asks
// its own server, which asks this helper. It listens on 127.0.0.1 only and answers only the Studio's server (a request that
// carries a browser Origin is refused). `make up` starts it: `node scripts/host-opener.mjs start|stop|status|serve`.
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { closeSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openInEditor, planOpen } from './open-editor.ts'
import type { EditorOptions, OpenRequest } from './open-editor.ts'

export const DEFAULT_PORT = 3098

const here = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(here), '../../..')
const pidFile = join(tmpdir(), 'landnam-host-opener.pid')
const logFile = join(tmpdir(), 'landnam-host-opener.log')

/** Changes whenever the helper's code does, so `start` replaces an older copy that is still running. */
export const helperVersion = (): string =>
  createHash('sha1').update(readFileSync(here)).update(readFileSync(join(dirname(here), 'open-editor.ts'))).digest('hex').slice(0, 8)

export interface OpenerOptions extends EditorOptions {
  /** Where the repo is on this machine. */
  root: string
}

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage, limit = 4096): Promise<string> {
  return new Promise((done, fail) => {
    let text = ''
    req.on('data', chunk => {
      text += chunk
      if (text.length > limit) { fail(new Error('That request is too large.')); req.destroy() }
    })
    req.on('end', () => done(text))
    req.on('error', fail)
  })
}

export function createOpener(options: OpenerOptions): Server {
  const { root, ...editor } = options
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname
      if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true, version: helperVersion(), root })
      if (req.method === 'POST' && path === '/open') {
        // A browser puts an Origin on every cross-site request. Only the Studio's own server, which sends none, may ask.
        if (req.headers.origin) return send(res, 403, { ok: false, reason: 'forbidden', message: 'Ask through the Studio.' })
        if (!req.headers['content-type']?.includes('application/json')) return send(res, 415, { ok: false, reason: 'bad-request', message: 'Send application/json.' })
        const plan = planOpen(root, JSON.parse(await readBody(req)) as OpenRequest)
        if (!plan.ok) return send(res, 400, { ok: false, reason: 'bad-request', message: plan.message })
        const result = await openInEditor(plan.target, editor)
        if (!result.ok) return send(res, 502, { ok: false, reason: 'editor-failed', message: result.message })
        console.log(`${new Date().toISOString()} opened ${plan.target.file}${plan.target.line ? `:${plan.target.line}` : ''} with ${result.command}`)
        return send(res, 200, { ok: true, file: plan.target.file, line: plan.target.line, command: result.command })
      }
      send(res, 404, { ok: false, reason: 'not-found', message: 'Unknown route.' })
    } catch (error) {
      send(res, 400, { ok: false, reason: 'bad-request', message: error instanceof Error ? error.message : String(error) })
    }
  })
}

const sleep = (ms: number) => new Promise(done => setTimeout(done, ms))

async function ping(port: number): Promise<{ version: string; root: string } | null> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(800) })
    return res.ok ? ((await res.json()) as { version: string; root: string }) : null
  } catch {
    return null
  }
}

async function stop(port: number): Promise<boolean> {
  // The pid file is only trusted while something on the port answers as the helper, so a recycled pid is never signalled.
  const running = await ping(port)
  let stopped = false
  if (running) {
    try { process.kill(Number(readFileSync(pidFile, 'utf8')), 'SIGTERM'); stopped = true } catch { /* already gone */ }
    for (let i = 0; i < 20 && (await ping(port)); i++) await sleep(100)
  }
  rmSync(pidFile, { force: true })
  return stopped
}

async function start(port: number): Promise<number> {
  const running = await ping(port)
  if (running?.version === helperVersion()) {
    console.log(`Cursor helper already running on 127.0.0.1:${port}`)
    return 0
  }
  if (running) await stop(port)
  const log = openSync(logFile, 'a')
  const child = spawn(process.execPath, [...process.execArgv, here, 'serve', '--port', String(port)], { detached: true, stdio: ['ignore', log, log] })
  child.unref()
  closeSync(log)
  for (let i = 0; i < 40; i++) {
    await sleep(100)
    if (await ping(port)) {
      console.log(`Cursor helper started on 127.0.0.1:${port} (opens Studio scripts in Cursor)`)
      return 0
    }
  }
  console.error(`Cursor helper did not start. See ${logFile}`)
  return 1
}

function serve(port: number) {
  const server = createOpener({ root: repoRoot })
  server.on('error', error => { console.error(`Cursor helper: ${error.message}`); process.exit(1) })
  server.listen(port, '127.0.0.1', () => {
    writeFileSync(pidFile, String(process.pid))
    console.log(`${new Date().toISOString()} listening on 127.0.0.1:${port} for ${repoRoot}`)
  })
  const bye = () => { rmSync(pidFile, { force: true }); server.close(); process.exit(0) }
  process.on('SIGTERM', bye)
  process.on('SIGINT', bye)
}

async function main(argv: string[]): Promise<number> {
  const command = argv[0] ?? 'status'
  const at = argv.indexOf('--port')
  const port = Number(at >= 0 ? argv[at + 1] : process.env.LANDNAM_OPENER_PORT ?? DEFAULT_PORT)
  if (command === 'serve') { serve(port); return -1 }
  if (command === 'start') return start(port)
  if (command === 'stop') { console.log((await stop(port)) ? 'Cursor helper stopped' : 'Cursor helper was not running'); return 0 }
  if (command === 'status') {
    const running = await ping(port)
    console.log(running ? `Cursor helper running on 127.0.0.1:${port} for ${running.root}` : `Cursor helper is not running (start it with: make up)`)
    return running ? 0 : 1
  }
  console.log('node scripts/host-opener.mjs start | stop | status | serve [--port N]\nOpens Studio scripts in Cursor from the Docker dev server. `make up` runs start.')
  return command === 'help' ? 0 : 1
}

if (process.argv[1] && resolve(process.argv[1]) === here) {
  const code = await main(process.argv.slice(2))
  if (code >= 0) process.exit(code)
}
