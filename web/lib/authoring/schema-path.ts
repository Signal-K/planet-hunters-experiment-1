// Finds the schema that describes a node in an authoring document, so the Studio's inspector can show the right editor
// (dropdown for an enum, number box with limits, checkbox) and the field's own description as help.
import type { Schema } from './schema.ts'
import type { Path } from './toml.ts'

export function deref(schema: Schema, root: Schema): Schema {
  let node = schema
  while (node.$ref) {
    const target = root.definitions?.[node.$ref.replace('#/definitions/', '')]
    if (!target) return node
    node = { ...target, description: node.description ?? target.description }
  }
  return node
}

export function schemaAt(root: Schema, path: Path): Schema | undefined {
  let node: Schema | undefined = deref(root, root)
  for (const part of path) {
    if (!node) return undefined
    node = deref(node, root)
    if (typeof part === 'number') node = node.items
    else if (node.properties?.[part]) node = node.properties[part]
    else if (typeof node.additionalProperties === 'object') node = node.additionalProperties
    else return undefined
  }
  return node ? deref(node, root) : undefined
}

export type FieldKind = 'enum' | 'boolean' | 'integer' | 'number' | 'string' | 'text' | 'strings' | 'rect' | 'dictionary' | 'table' | 'list' | 'unknown'

const LONG_TEXT = new Set(['note', 'summary', 'brief', 'direction', 'about', 'description'])

/** Which editor a value gets. `key` is the field name, used only to pick a multi-line box for prose. */
export function fieldKind(schema: Schema | undefined, value: unknown, key: string): FieldKind {
  if (schema?.enum) return 'enum'
  const type = [schema?.type ?? (typeof value === 'object' ? (Array.isArray(value) ? 'array' : 'object') : typeof value)].flat()[0]
  if (type === 'boolean') return 'boolean'
  if (type === 'integer') return 'integer'
  if (type === 'number') return 'number'
  if (type === 'string') return LONG_TEXT.has(key) || (typeof value === 'string' && value.length > 60) ? 'text' : 'string'
  if (type === 'array') {
    const items = schema?.items
    const scalar = !items || (items.type !== 'object' && !items.$ref)
    return scalar && (!Array.isArray(value) || value.every(v => typeof v !== 'object')) ? 'strings' : 'list'
  }
  if (type === 'object') {
    const props = schema?.properties
    if (props && ['x', 'y', 'w', 'h'].every(k => props[k]?.type === 'number')) return 'rect'
    if (schema && !props && typeof schema.additionalProperties === 'object') return 'dictionary'
    return 'table'
  }
  return 'unknown'
}

/** A starting value for a key the author chooses to add. */
export function defaultFor(schema: Schema | undefined): unknown {
  if (schema?.enum) return schema.enum[0]
  if (schema?.const !== undefined) return schema.const
  const type = [schema?.type ?? 'string'].flat()[0]
  if (type === 'boolean') return false
  if (type === 'integer' || type === 'number') return schema?.minimum ?? 0
  if (type === 'array') return []
  if (type === 'object') return schema?.properties?.x && schema.properties.w ? { x: 0.1, y: 0.1, w: 0.3, h: 0.1 } : {}
  return ''
}
