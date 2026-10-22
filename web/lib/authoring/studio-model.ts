// Pure helpers behind the Scene Studio's canvas and hierarchy. No React, no network: easy to test, and the same maths
// decides what the overlay draws and what a drag writes back to the file.
import { sandboxName } from '../sandbox.ts'
import type { Rect, SceneObject } from './docs.ts'
import type { Setup } from './things.ts'

export const VIEWPORTS = {
  ph: { w: 390, h: 844, label: 'Phone', hint: 'portrait 390x844' },
  ls: { w: 926, h: 428, label: 'Landscape', hint: 'phone 926x428' },
  dk: { w: 1440, h: 900, label: 'Desktop', hint: '1440x900' },
} as const
export type ViewportKey = keyof typeof VIEWPORTS

export const STEP = 0.005
const round = (n: number): number => Math.round(n / STEP) * STEP
const trim = (n: number): number => Number(n.toFixed(3))

/** Snap to the 0.005 grid so the numbers written to the file stay short and readable. */
export const snap = (n: number): number => trim(round(n))

export function clampRect(rect: Rect, min = 0.02): Rect {
  const w = Math.min(1, Math.max(min, rect.w))
  const h = Math.min(1, Math.max(min, rect.h))
  return { x: snap(Math.min(1 - w, Math.max(0, rect.x))), y: snap(Math.min(1 - h, Math.max(0, rect.y))), w: snap(w), h: snap(h) }
}

export type Slots = Record<string, { x: number; y: number; w: number; h: number }>

/** Where an object is drawn: its own rect, else its slot. The world slot fills the whole scene, so it draws nothing. */
export function objectRect(object: SceneObject, slots: Slots): Rect | null {
  if (object.rect) return object.rect
  if (object.slot && object.slot !== 'world' && slots[object.slot]) {
    const { x, y, w, h } = slots[object.slot]
    return { x, y, w, h }
  }
  return null
}

export interface ObjectNode {
  object: SceneObject
  index: number
  children: ObjectNode[]
}

/** The flat `objects` list as a tree, in file order, using `parent`. An object whose parent is missing sits at the top. */
export function buildObjectTree(objects: SceneObject[]): ObjectNode[] {
  const nodes = objects.map((object, index): ObjectNode => ({ object, index, children: [] }))
  const byId = new Map(nodes.map(n => [n.object.id, n]))
  const roots: ObjectNode[] = []
  for (const node of nodes) {
    const parent = node.object.parent ? byId.get(node.object.parent) : undefined
    if (parent && parent !== node) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

export function uniqueId(prefix: string, objects: SceneObject[]): string {
  const taken = new Set(objects.map(o => o.id))
  let n = 1
  while (taken.has(`${prefix}-${n}`)) n++
  return `${prefix}-${n}`
}

/** Ids of an object and everything beneath it, used to re-parent children when an id changes. */
export function descendantsOf(objects: SceneObject[], id: string): string[] {
  const out: string[] = []
  const walk = (parent: string) => {
    for (const o of objects) if (o.parent === parent) { out.push(o.id); walk(o.id) }
  }
  walk(id)
  return out
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se'

/** The rectangle after dragging a corner (or the body, when corner is null) by a normalised delta. Edges stop at the opposite edge. */
export function dragRect(start: Rect, corner: Corner | null, dx: number, dy: number, min = 0.02): Rect {
  if (!corner) return clampRect({ ...start, x: start.x + dx, y: start.y + dy })
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
  let l = start.x
  let t = start.y
  let r = start.x + start.w
  let b = start.y + start.h
  if (corner.includes('w')) l = clamp(l + dx, 0, r - min)
  if (corner.includes('e')) r = clamp(r + dx, l + min, 1)
  if (corner.includes('n')) t = clamp(t + dy, 0, b - min)
  if (corner.includes('s')) b = clamp(b + dy, t + min, 1)
  return { x: snap(l), y: snap(t), w: snap(r - l), h: snap(b - t) }
}

/**
 * The stage page for a view. With a setup it is the sandbox: the entry fixture with its campaign removed, the setup's state
 * layered on, and its URL switches (time, sky, ...). Without one it is a game checkpoint exactly as the fixture defines it.
 */
export function stageSrc(entry: string, setup: Setup | null, bump: number): string {
  const params = new URLSearchParams({ preset: setup ? sandboxName(entry, setup.state) : entry })
  for (const [key, value] of Object.entries(setup?.query ?? {})) params.set(key, value)
  params.set('_', String(bump))
  return `/game/stage?${params}`
}

/** A link that opens a repo file in Cursor, at a line when one is known. Needs the repo's path on this machine. */
export function scriptHref(hostRoot: string, file: string, line?: number): string {
  const root = hostRoot.replace(/\/+$/, '')
  return `cursor://file${root.startsWith('/') ? '' : '/'}${root}/${file}${line ? `:${line}:1` : ''}`
}

/** The line of the `[[table]]` header whose entry has this `id`, so a link can open the file at that thing or preset. */
export function lineOfId(text: string, table: string, id: string): number | undefined {
  const lines = text.split('\n')
  let header = 0
  let inTable = false
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^\[\[([A-Za-z0-9_.-]+)\]\]/)
    if (open) { inTable = open[1] === table; header = i + 1; continue }
    if (lines[i].startsWith('[')) { inTable = false; continue }
    if (inTable && new RegExp(`^id\\s*=\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(lines[i])) return header
  }
  return undefined
}

/** Focus ids may be scene script ids or qa/scenes.json ids; this maps them all to scene script ids, without repeats. */
export function resolveFocusScenes(scenes: { id: string; qa: string[] }[], ids: string[]): string[] {
  const resolved = ids.map(id => scenes.find(s => s.id === id)?.id ?? scenes.find(s => s.qa.includes(id))?.id).filter((id): id is string => !!id)
  return [...new Set(resolved)]
}
