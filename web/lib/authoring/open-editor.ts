// Which files the Studio may open in the editor, and how it opens them. The host helper (scripts/host-opener.mjs) and the
// Studio's API route share this, so both apply the same rules. It runs under plain Node type stripping: relative `.ts`
// imports, no enums, no parameter properties.
import { spawn } from 'node:child_process'
import { existsSync, realpathSync, statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

export interface OpenRequest {
  /** Repo-relative path, or an absolute path under one of the repo's known locations. */
  file: string
  line?: number
  column?: number
}

export interface OpenTarget {
  /** Repo-relative, with forward slashes. */
  file: string
  /** Absolute, as the machine that runs the editor sees it. */
  path: string
  line?: number
  column?: number
}

export type OpenPlan = { ok: true; target: OpenTarget } | { ok: false; message: string }

export type OpenResult = { ok: true; command: string } | { ok: false; message: string }

const MAX_PATH = 400
/** Hidden folders (.git, .env, .ssh), installed packages and local databases are never opened from a page. */
const NOT_OPENED = /(^|\/)(\.[^/]*|node_modules|pb_data)(\/|$)/
const bad = (message: string): OpenPlan => ({ ok: false, message })

/** An absolute path under one of `roots` becomes repo-relative; a relative path passes through; anything else is null. */
export function repoRelative(file: string, roots: (string | undefined)[]): string | null {
  if (!isAbsolute(file)) return file
  for (const root of roots) {
    const base = root?.replace(/\/+$/, '')
    if (base && file.startsWith(`${base}/`)) return file.slice(base.length + 1)
  }
  return null
}

const whole = (n: unknown): number | undefined => (typeof n === 'number' && Number.isInteger(n) && n >= 1 ? Math.min(n, 1_000_000) : undefined)

/**
 * Checks a request against the repo at `root` (where the repo is on the machine doing the check) and says exactly what to
 * open. Existing files must be real files inside the repo; a file that does not exist yet can only be one of the authoring
 * files, so the editor can create it.
 */
export function planOpen(root: string, request: OpenRequest): OpenPlan {
  const file = typeof request.file === 'string' ? request.file : ''
  if (!file || file.length > MAX_PATH || file.includes('\0')) return bad('Say which file to open.')
  const rel = repoRelative(file, [root])
  if (rel === null) return bad('That file is outside the repo.')
  const abs = resolve(root, rel)
  const inside = relative(root, abs)
  if (!inside || inside.startsWith('..') || isAbsolute(inside)) return bad('That file is outside the repo.')
  const posix = inside.split(sep).join('/')
  if (NOT_OPENED.test(posix)) return bad('The Studio does not open that kind of file.')
  if (existsSync(abs)) {
    if (!statSync(abs).isFile()) return bad('That is a folder, not a file.')
    if (!realpathSync(abs).startsWith(realpathSync(root) + sep)) return bad('That file is outside the repo.')
  } else if (!posix.startsWith('shared/authoring/') || !existsSync(dirname(abs))) {
    return bad('That file does not exist.')
  }
  const line = whole(request.line)
  return { ok: true, target: { file: posix, path: abs, line, column: line ? whole(request.column) ?? 1 : undefined } }
}

/** What to hand the editor's command line: reuse the window you used last and go to the line. */
export function editorArgs(target: OpenTarget): string[] {
  return ['--reuse-window', '--goto', target.line ? `${target.path}:${target.line}:${target.column ?? 1}` : target.path]
}

/** The editor commands to try, in order. LANDNAM_EDITOR, when set, is the only one: another editor or a stand-in, never a silent fallback. */
export function editorCommands(env: Record<string, string | undefined> = process.env): string[] {
  if (env.LANDNAM_EDITOR) return [env.LANDNAM_EDITOR]
  return ['/usr/local/bin/cursor', '/opt/homebrew/bin/cursor', '/Applications/Cursor.app/Contents/Resources/app/bin/cursor', 'cursor']
}

function runOnce(command: string, args: string[], waitMs: number): Promise<{ missing: boolean; code: number | null; stderr: string }> {
  return new Promise(done => {
    let stderr = ''
    let settled = false
    const finish = (value: { missing: boolean; code: number | null; stderr: string }) => { if (!settled) { settled = true; done(value) } }
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    child.stderr?.on('data', chunk => { stderr = (stderr + chunk).slice(-400) })
    child.on('error', error => finish({ missing: (error as NodeJS.ErrnoException).code === 'ENOENT', code: null, stderr: error.message }))
    child.on('exit', code => finish({ missing: false, code, stderr }))
    // The editor's command line normally hands over and exits within a second. One that is still running has taken the file.
    setTimeout(() => { child.unref(); finish({ missing: false, code: 0, stderr }) }, waitMs)
  })
}

export interface EditorOptions {
  env?: Record<string, string | undefined>
  /** Replaces the list of editor commands to try. Tests use this so the real editor is never launched. */
  commands?: string[]
  /** How long to wait for the editor's command line to hand over. */
  waitMs?: number
}

/** Opens a planned target in the editor on this machine. */
export async function openInEditor(target: OpenTarget, options: EditorOptions = {}): Promise<OpenResult> {
  const { env = process.env, waitMs = 6000 } = options
  const args = editorArgs(target)
  for (const command of options.commands ?? editorCommands(env)) {
    if (isAbsolute(command) && !existsSync(command)) continue
    const run = await runOnce(command, args, waitMs)
    if (run.missing) continue
    if (run.code === 0) return { ok: true, command }
    return { ok: false, message: `The editor command (${command}) failed${run.stderr.trim() ? `: ${run.stderr.trim().split('\n').pop()}` : ` with code ${run.code}`}.` }
  }
  return { ok: false, message: 'No Cursor command was found on this machine. Set LANDNAM_EDITOR to the path of its command line tool.' }
}
