// Surgical TOML edits for the Scene Studio. An edit replaces or inserts only the bytes it needs to, so comments,
// ordering and the author's own formatting survive. Every result is re-parsed; an edit that would break the file is refused.
import { parseToml, tomlKey, tomlValue, valueAtPath } from './toml.ts'
import type { ParsedToml, Path } from './toml.ts'

export type EditOp =
  | { op: 'set'; path: Path; value: unknown }
  | { op: 'remove'; path: Path }
  | { op: 'append'; path: Path; value: Record<string, unknown> }

export type EditResult = { ok: true; text: string } | { ok: false; error: string }

interface Splice {
  start: number
  end: number
  insert: string
}

const lineStart = (text: string, offset: number): number => text.lastIndexOf('\n', offset - 1) + 1

const lineEnd = (text: string, offset: number): number => {
  const nl = text.indexOf('\n', offset)
  return nl === -1 ? text.length : nl + 1
}

const startsWith = (path: Path, prefix: Path): boolean => prefix.length <= path.length && prefix.every((part, i) => path[i] === part)

const pairs = (value: Record<string, unknown>): string[] =>
  Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${tomlKey(k)} = ${tomlValue(v)}`)

/** Text for a new line placed just after the line that holds `offset`. */
function insertLineAfter(text: string, offset: number, line: string): Splice {
  const pos = lineEnd(text, offset)
  const needsBreak = pos === text.length && !text.endsWith('\n')
  return { start: pos, end: pos, insert: `${needsBreak ? '\n' : ''}${line}\n` }
}

function planSet(doc: ParsedToml, path: Path, value: unknown): Splice | string {
  const rendered = tomlValue(value)
  const existing = doc.at(path)
  if (existing?.kind === 'key-value' || existing?.kind === 'element') {
    return { start: existing.value.range[0], end: existing.value.range[1], insert: rendered }
  }
  if (existing) return 'cannot set a whole table; set its keys instead'

  const key = path[path.length - 1]
  if (typeof key !== 'string') return 'cannot add an array element by index; use append for tables or set the whole array'
  const parentPath = path.slice(0, -1)
  const line = `${tomlKey(key)} = ${rendered}`

  if (parentPath.length === 0) {
    const topLevel = doc.ast.body[0].body.filter(node => node.type === 'TOMLKeyValue')
    if (!topLevel.length) return { start: 0, end: 0, insert: `${line}\n` }
    return insertLineAfter(doc.text, topLevel[topLevel.length - 1].range[1], line)
  }
  const parent = doc.at(parentPath)
  if (parent?.kind === 'table' || parent?.kind === 'array-table') {
    return insertLineAfter(doc.text, parent.node.range[1], line)
  }
  if (parent?.kind === 'key-value' && parent.value.type === 'TOMLInlineTable') {
    const merged = { ...(valueAtPath(doc.value, parentPath) as Record<string, unknown>), [key]: value }
    return { start: parent.value.range[0], end: parent.value.range[1], insert: tomlValue(merged) }
  }
  if (!parent && parentPath.every(part => typeof part === 'string')) {
    const header = `[${(parentPath as string[]).map(tomlKey).join('.')}]`
    const lead = doc.text.length === 0 || doc.text.endsWith('\n\n') ? '' : doc.text.endsWith('\n') ? '\n' : '\n\n'
    return { start: doc.text.length, end: doc.text.length, insert: `${lead}${header}\n${line}\n` }
  }
  return `cannot add ${JSON.stringify(path)}: its parent does not exist`
}

function planRemove(doc: ParsedToml, path: Path): Splice | string {
  const info = doc.at(path)
  if (!info) return `${JSON.stringify(path)} not found`
  const { text } = doc

  if (info.kind === 'element' || (info.kind === 'key-value' && info.inline)) {
    const parentPath = path.slice(0, -1)
    const parent = valueAtPath(doc.value, parentPath)
    const last = path[path.length - 1]
    let next: unknown
    if (Array.isArray(parent) && typeof last === 'number') next = parent.filter((_, i) => i !== last)
    else if (parent && typeof parent === 'object' && typeof last === 'string') {
      const { [last]: _gone, ...rest } = parent as Record<string, unknown>
      next = rest
    } else return `${JSON.stringify(path)} cannot be removed`
    return planSet(doc, parentPath, next)
  }

  if (info.kind === 'key-value') {
    let start = lineStart(text, info.kv.range[0])
    while (start > 0) {
      const previous = lineStart(text, start - 1)
      if (text.slice(previous, start - 1).trimStart().startsWith('#')) start = previous
      else break
    }
    return { start, end: lineEnd(text, info.kv.range[1]), insert: '' }
  }

  const owned = doc.tables.filter(t => startsWith(t.path, path))
  const first = Math.min(...owned.map(t => t.node.range[0]))
  const last = Math.max(...owned.map(t => t.node.range[1]))
  if (doc.tables.some(t => !owned.includes(t) && t.node.range[0] > first && t.node.range[0] < last)) {
    return `${JSON.stringify(path)} is interleaved with other tables and cannot be removed safely`
  }
  let start = lineStart(text, first)
  while (start > 0) {
    const previous = lineStart(text, start - 1)
    if (text.slice(previous, start - 1).trimStart().startsWith('#')) start = previous
    else break
  }
  let end = lineEnd(text, last)
  while (end < text.length) {
    const next = lineEnd(text, end)
    if (text.slice(end, next).trim() === '') end = next
    else break
  }
  return { start, end, insert: '' }
}

function planAppend(doc: ParsedToml, path: Path, value: Record<string, unknown>): Splice | string {
  if (!path.length || path.some(part => typeof part !== 'string')) return 'append needs a path of table names, such as ["objects"]'
  const header = `[[${(path as string[]).map(tomlKey).join('.')}]]`
  const block = `${header}\n${pairs(value).join('\n')}${Object.keys(value).length ? '\n' : ''}`
  const elements = doc.tables.filter(t => t.kind === 'array-table' && t.path.length === path.length + 1 && startsWith(t.path, path))
  const { text } = doc

  if (!elements.length) {
    const lead = text.length === 0 || text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n'
    return { start: text.length, end: text.length, insert: `${lead}${block}` }
  }
  const lastIndex = Math.max(...elements.map(t => t.path[path.length] as number))
  const owned = doc.tables.filter(t => startsWith(t.path, [...path, lastIndex]))
  const at = lineEnd(text, Math.max(...owned.map(t => t.node.range[1])))
  const needsBreak = at === text.length && !text.endsWith('\n')
  return { start: at, end: at, insert: `${needsBreak ? '\n' : ''}\n${block}` }
}

export function applyEdit(text: string, op: EditOp): EditResult {
  const parsed = parseToml(text)
  if (!parsed.ok) return { ok: false, error: `line ${parsed.error.line}: ${parsed.error.message}` }
  const plan =
    op.op === 'set' ? planSet(parsed.doc, op.path, op.value)
    : op.op === 'remove' ? planRemove(parsed.doc, op.path)
    : planAppend(parsed.doc, op.path, op.value)
  if (typeof plan === 'string') return { ok: false, error: plan }

  let next = text.slice(0, plan.start) + plan.insert + text.slice(plan.end)
  if (op.op === 'remove') next = next.length ? next.replace(/\n{2,}$/, '\n') : next
  const check = parseToml(next)
  if (!check.ok) return { ok: false, error: `that edit would break the file (line ${check.error.line}: ${check.error.message})` }
  return { ok: true, text: next }
}

export function applyEdits(text: string, ops: EditOp[]): EditResult {
  let current = text
  for (const op of ops) {
    const result = applyEdit(current, op)
    if (!result.ok) return result
    current = result.text
  }
  return { ok: true, text: current }
}
