// TOML with source positions. Every authoring tool (compiler, validator, Studio edits) goes through this file so that
// a path such as ['objects', 2, 'rect', 'x'] always maps to the exact bytes that define it.
import { getStaticTOMLValue, parseTOML } from 'toml-eslint-parser'
import type { AST } from 'toml-eslint-parser'

type TOMLContentNode = AST.TOMLContentNode
type TOMLKeyValue = AST.TOMLKeyValue
type TOMLProgram = AST.TOMLProgram
type TOMLTable = AST.TOMLTable

export type Path = (string | number)[]

export interface TomlSyntaxError {
  message: string
  line: number
  column: number
  index: number
}

export interface TableInfo {
  kind: 'table' | 'array-table'
  path: Path
  node: TOMLTable
}

export interface KeyValueInfo {
  kind: 'key-value'
  path: Path
  kv: TOMLKeyValue
  value: TOMLContentNode
  /** True when the pair sits inside an inline table, so it does not own a line of its own. */
  inline: boolean
}

export interface ElementInfo {
  kind: 'element'
  path: Path
  value: TOMLContentNode
}

export type NodeInfo = TableInfo | KeyValueInfo | ElementInfo

export interface ParsedToml {
  text: string
  ast: TOMLProgram
  value: Record<string, unknown>
  tables: TableInfo[]
  at(path: Path): NodeInfo | undefined
}

export type ParseResult = { ok: true; doc: ParsedToml } | { ok: false; error: TomlSyntaxError }

export const pathKey = (path: Path): string => JSON.stringify(path)

export function parseToml(text: string): ParseResult {
  let ast: TOMLProgram
  try {
    ast = parseTOML(text)
  } catch (error) {
    const e = error as { message?: string; lineNumber?: number; column?: number; index?: number }
    return {
      ok: false,
      error: { message: String(e.message ?? error), line: e.lineNumber ?? 1, column: (e.column ?? 0) + 1, index: e.index ?? 0 },
    }
  }
  const index = new Map<string, NodeInfo>()
  const tables: TableInfo[] = []

  const addValue = (path: Path, value: TOMLContentNode) => {
    if (value.type === 'TOMLInlineTable') {
      for (const kv of value.body) addKeyValue(path, kv, true)
    } else if (value.type === 'TOMLArray') {
      value.elements.forEach((element, i) => {
        const childPath = [...path, i]
        index.set(pathKey(childPath), { kind: 'element', path: childPath, value: element })
        addValue(childPath, element)
      })
    }
  }
  const addKeyValue = (base: Path, kv: TOMLKeyValue, inline: boolean) => {
    const keys = kv.key.keys.map(k => (k.type === 'TOMLBare' ? k.name : k.value))
    const path = [...base, ...keys]
    index.set(pathKey(path), { kind: 'key-value', path, kv, value: kv.value, inline })
    addValue(path, kv.value)
  }

  for (const node of ast.body[0].body) {
    if (node.type === 'TOMLKeyValue') {
      addKeyValue([], node, false)
    } else {
      const info: TableInfo = { kind: node.kind === 'array' ? 'array-table' : 'table', path: node.resolvedKey, node }
      index.set(pathKey(info.path), info)
      tables.push(info)
      for (const kv of node.body) addKeyValue(node.resolvedKey, kv, false)
    }
  }

  return {
    ok: true,
    doc: {
      text,
      ast,
      value: getStaticTOMLValue(ast) as Record<string, unknown>,
      tables,
      at: path => index.get(pathKey(path)),
    },
  }
}

export interface Span {
  start: number
  end: number
  line: number
  column: number
  endLine: number
  endColumn: number
}

/** 1-based line and column for a character offset. */
export function positionAt(text: string, offset: number): { line: number; column: number } {
  let line = 1
  let lineStart = 0
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line++
      lineStart = i + 1
    }
  }
  return { line, column: offset - lineStart + 1 }
}

export function spanOf(text: string, range: [number, number]): Span {
  const a = positionAt(text, range[0])
  const b = positionAt(text, range[1])
  return { start: range[0], end: range[1], line: a.line, column: a.column, endLine: b.line, endColumn: b.column }
}

/** The span a diagnostic about `path` should underline: the value if there is one, else the nearest ancestor. */
export function spanForPath(doc: ParsedToml, path: Path): Span {
  for (let n = path.length; n >= 0; n--) {
    const info = doc.at(path.slice(0, n))
    if (!info) continue
    if (info.kind === 'key-value') return spanOf(doc.text, n === path.length ? info.kv.range : info.kv.key.range)
    if (info.kind === 'element') return spanOf(doc.text, info.value.range)
    return spanOf(doc.text, info.node.key.range)
  }
  return spanOf(doc.text, [0, Math.min(doc.text.indexOf('\n') === -1 ? doc.text.length : doc.text.indexOf('\n'), doc.text.length)])
}

export function valueAtPath(root: unknown, path: Path): unknown {
  let cursor: unknown = root
  for (const part of path) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string | number, unknown>)[part]
  }
  return cursor
}

const BARE_KEY = /^[A-Za-z0-9_-]+$/

export function tomlKey(key: string): string {
  return BARE_KEY.test(key) ? key : JSON.stringify(key)
}

/** A string as TOML. Text with line breaks becomes a multi-line string, so prose stays readable when the file is opened in an editor. */
function tomlString(text: string): string {
  if (!text.includes('\n')) return JSON.stringify(text)
  const body = text
    .replaceAll('\\', '\\\\')
    .replaceAll('\r', '\\r')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .replaceAll('"""', '""\\"')
    .replace(/"$/, '\\"')
  return `"""\n${body}"""`
}

/** A TOML value: strings (multi-line when they contain line breaks), numbers, booleans, arrays and inline tables. */
export function tomlValue(value: unknown): string {
  if (typeof value === 'string') return tomlString(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`TOML cannot hold ${value}`)
    return String(value)
  }
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(', ')}]`
  if (value && typeof value === 'object') {
    const pairs = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined)
    return pairs.length ? `{ ${pairs.map(([k, v]) => `${tomlKey(k)} = ${tomlValue(v)}`).join(', ')} }` : '{}'
  }
  throw new Error(`TOML cannot hold ${value === null ? 'null' : typeof value}`)
}
