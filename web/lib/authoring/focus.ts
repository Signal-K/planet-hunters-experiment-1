// "Which scenes is this work in?" The Scene Studio focus file, shared by the
// Studio CLI and the editor.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface Focus {
  /** Scene ids (a scene script id or a qa/scenes.json id). */
  scenes: string[]
  note: string
  ticket: string
  title: string
  description: string
}

export const focusPath = (root: string): string => join(root, 'web/.studio', 'focus.json')

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

export function readFocus(root: string): Focus | null {
  const file = focusPath(root)
  if (!existsSync(file)) return null
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<Focus>
    return { scenes: Array.isArray(parsed.scenes) ? parsed.scenes.filter((s): s is string => typeof s === 'string') : [], note: text(parsed.note), ticket: text(parsed.ticket), title: text(parsed.title), description: text(parsed.description) }
  } catch {
    return null
  }
}

export function writeFocus(root: string, focus: Partial<Focus>): Focus {
  const next: Focus = { scenes: [...new Set(focus.scenes ?? [])], note: text(focus.note), ticket: text(focus.ticket), title: text(focus.title), description: text(focus.description) }
  const file = focusPath(root)
  mkdirSync(dirname(file), { recursive: true })
  const pending = `${file}.${process.pid}.tmp`
  writeFileSync(pending, JSON.stringify(next))
  renameSync(pending, file)
  return next
}
