// `node scripts/studio.mjs <command>`: which scenes is this work in, and how do I open the editor on them?
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { focusPath, readFocus, writeFocus } from './focus.ts'
import { listScenes, scenesForFile, scenesForTicket, toRepoPath } from './scenes.ts'
import type { SceneSummary } from './scenes.ts'

const HELP = `Landnam Scene Studio, for agents and for you

  where <SSL-123 | file ...>   Scenes a ticket or files belong to, with their Studio links and any open feedback.
  changed                      Scenes touched by uncommitted work (git status).
  focus <scene ...> [--ticket SSL-123] [--title "..."] [--desc "..."]
                               Declare the scenes you are working in. Studio shows it.
  focus --clear                Clear the declaration.
  open <scene> [--state key]   Print the Studio link and point the editor's Simple Browser at it.
  briefs                       Scenes with open notes from you, and where the files are.

The Studio runs with the dev stack (make up): ${'$'}STUDIO_URL or http://localhost:4320/game/studio.
Scene scripts are shared/authoring/scenes/<scene>.toml. Read the feedback file and notes before changing a scene.`

const base = () => (process.env.STUDIO_URL ?? 'http://localhost:4320').replace(/\/$/, '')
const link = (id: string, state?: string) => `${base()}/game/studio?scene=${id}${state ? `&state=${state}` : ''}`

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

function positional(args: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { i += args[i] === '--clear' ? 0 : 1; continue }
    out.push(args[i])
  }
  return out
}

function describe(scene: SceneSummary): string {
  const f = scene.feedback
  const notes = f.exists ? `  notes: ${f.unresolved} open of ${f.wrong} wrong, ${f.keep} keep, ${f.inspiration} inspiration, mode ${f.mode ?? 'fix'}, ${f.status ?? 'open'}` : ''
  return `${scene.id.padEnd(20)} ${scene.type.padEnd(13)} ${link(scene.id)}${notes}`
}

function writeFollow(root: string, route: string): void {
  const out = join(root, 'web/.dev-follow.json')
  const pending = `${out}.${process.pid}.tmp`
  writeFileSync(pending, JSON.stringify({ route, file: 'studio', ts: Date.now() }))
  renameSync(pending, out)
}

function changedFiles(root: string): string[] {
  try {
    return execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8', maxBuffer: 8_000_000 })
      .split('\n').filter(Boolean).map(line => line.slice(3).replace(/^"|"$/g, '').replace(/^.* -> /, ''))
  } catch {
    return []
  }
}

export function main(argv: string[], root: string): number {
  const [command = 'help', ...args] = argv
  if (command === 'help' || command === '--help') { console.log(HELP); return 0 }
  const scenes = listScenes(root)
  const known = new Set(scenes.map(s => s.id))

  if (command === 'where' || command === 'changed') {
    const inputs = command === 'changed' ? changedFiles(root) : positional(args)
    if (!inputs.length) { console.log(command === 'changed' ? 'No uncommitted changes.' : 'Give a ticket (SSL-123) or file paths.'); return command === 'changed' ? 0 : 1 }
    const hits = new Map<string, string[]>()
    for (const input of inputs) {
      const ids = /^[A-Za-z]+-\d+$/.test(input) ? scenesForTicket(scenes, input) : scenesForFile(scenes, toRepoPath(root, input))
      for (const id of ids) hits.set(id, [...(hits.get(id) ?? []), input])
    }
    if (!hits.size) { console.log('No scene matches. A scene lists its files under [runtime] in shared/authoring/scenes/<scene>.toml and its tickets in tickets = [...].'); return 0 }
    for (const [id, via] of hits) {
      console.log(describe(scenes.find(s => s.id === id)!))
      if (command === 'where' && via.length <= 3) console.log(`  via ${via.join(', ')}`)
    }
    console.log(`\nDeclare it:  node scripts/studio.mjs focus ${[...hits.keys()].join(' ')}${/^[A-Za-z]+-\d+$/.test(inputs[0] ?? '') ? ` --ticket ${inputs[0].toUpperCase()}` : ''}`)
    return 0
  }

  if (command === 'focus') {
    if (args.includes('--clear')) { writeFocus(root, {}); console.log('focus cleared'); return 0 }
    const ids = positional(args)
    const bad = ids.filter(id => !known.has(id))
    if (!ids.length || bad.length) { console.log(bad.length ? `Unknown scene: ${bad.join(', ')}. Known: ${[...known].join(', ')}` : 'Name at least one scene.'); return 1 }
    // Keep script and fixture ids together so the harness can resolve either.
    const qa = ids.flatMap(id => scenes.find(s => s.id === id)?.qa ?? [])
    writeFocus(root, { scenes: [...ids, ...qa], ticket: flag(args, 'ticket'), title: flag(args, 'title'), description: flag(args, 'desc') })
    console.log(`focus: ${ids.join(' ')}${flag(args, 'ticket') ? ` [${flag(args, 'ticket')}]` : ''}`)
    for (const id of ids) console.log(`  ${link(id)}`)
    return 0
  }

  if (command === 'touch') {
    // Called by the edit hook: add the scenes a file belongs to, quietly.
    const ids = scenesForFile(scenes, toRepoPath(root, args[0] ?? ''))
    if (!ids.length) return 0
    const current = readFocus(root)
    const qa = ids.flatMap(id => scenes.find(s => s.id === id)?.qa ?? [])
    const merged = [...new Set([...ids, ...qa, ...(current?.scenes ?? [])])].slice(0, 10)
    if (!existsSync(dirname(focusPath(root)))) mkdirSync(dirname(focusPath(root)), { recursive: true })
    writeFocus(root, { ...current, scenes: merged })
    return 0
  }

  if (command === 'open') {
    const id = positional(args)[0]
    if (!id || !known.has(id)) { console.log(`Say which scene. Known: ${[...known].join(', ')}`); return 1 }
    const url = link(id, flag(args, 'state'))
    writeFollow(root, `/game/studio?scene=${id}${flag(args, 'state') ? `&state=${flag(args, 'state')}` : ''}`)
    console.log(url)
    return 0
  }

  if (command === 'briefs') {
    const open = scenes.filter(s => s.feedback.exists && (s.feedback.unresolved > 0 || s.feedback.status === 'open'))
    if (!open.length) { console.log('No open feedback.'); return 0 }
    for (const s of open) {
      console.log(describe(s))
      console.log(`  read: shared/authoring/feedback/${s.id}.toml, shared/authoring/instructions/scenes/${s.id}.md`)
    }
    return 0
  }

  console.log(HELP)
  return 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2), process.env.LANDNAM_REPO_ROOT ?? process.cwd()))
}
