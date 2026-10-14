import { execFile } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { isDevLauncherEnabled } from '@/lib/devAccess'

const run = promisify(execFile)
const FOCUS_FILE = process.env.STORYBOARD_FOCUS_FILE ?? '/tmp/landnam-focus.json'
const RECENT_MS = 10 * 60_000

// What is being edited right now, for the storyboard highlight:
//  - `focus`: scene ids an agent declared in $STORYBOARD_FOCUS_FILE (scripts/storyboard-focus.sh), with an optional note.
//  - `files`: changed files (git status) whose mtime is within the last 10 minutes; the client matches these to scenes by name.
export async function GET() {
  if (!isDevLauncherEnabled()) return new Response('Not found', { status: 404 })
  const root = path.join(process.cwd(), '..')
  let focus: { scenes?: string[]; note?: string } = {}
  try { focus = JSON.parse(await readFile(FOCUS_FILE, 'utf8')) } catch { /* no focus declared */ }
  const files: string[] = []
  try {
    const { stdout } = await run('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, maxBuffer: 4_000_000 })
    const now = Date.now()
    await Promise.all(stdout.split('\n').filter(Boolean).map(async line => {
      const f = line.slice(3).replace(/^"|"$/g, '')
      try { if (now - (await stat(path.join(root, f))).mtimeMs < RECENT_MS) files.push(f) } catch { /* deleted */ }
    }))
  } catch { /* not a git checkout */ }
  return Response.json({ scenes: focus.scenes ?? [], note: focus.note ?? '', files }, { headers: { 'cache-control': 'no-store' } })
}
