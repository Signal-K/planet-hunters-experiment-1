// A small JSON Schema engine (draft-07 subset) for the authoring schemas in shared/authoring/schema/. The same schema
// files drive Cursor's TOML completion, the Studio inspector and this validator, so there is one description of each format.
import type { Path } from './toml.ts'

export type SchemaType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'

export interface Schema {
  $ref?: string
  type?: SchemaType | SchemaType[]
  enum?: unknown[]
  const?: unknown
  properties?: Record<string, Schema>
  required?: string[]
  additionalProperties?: boolean | Schema
  items?: Schema
  minItems?: number
  minimum?: number
  maximum?: number
  minLength?: number
  pattern?: string
  anyOf?: Schema[]
  description?: string
  definitions?: Record<string, Schema>
  title?: string
}

export interface SchemaIssue {
  path: Path
  code: string
  message: string
}

const typeName = (value: unknown): string =>
  value === null ? 'null' : Array.isArray(value) ? 'a list' : typeof value === 'object' ? 'a table' : typeof value === 'number' ? 'a number' : typeof value === 'string' ? 'a string' : 'a boolean'

const article = (type: SchemaType): string =>
  ({ object: 'a table', array: 'a list', string: 'a string', number: 'a number', integer: 'a whole number', boolean: 'true or false' })[type]

function matchesType(value: unknown, type: SchemaType): boolean {
  switch (type) {
    case 'object': return value !== null && typeof value === 'object' && !Array.isArray(value)
    case 'array': return Array.isArray(value)
    case 'string': return typeof value === 'string'
    case 'number': return typeof value === 'number' && Number.isFinite(value)
    case 'integer': return typeof value === 'number' && Number.isInteger(value)
    case 'boolean': return typeof value === 'boolean'
  }
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const held = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = held
    }
  }
  return row[b.length]
}

export const closest = (word: string, options: string[]): string | undefined => {
  let best: string | undefined
  let bestDistance = Math.max(2, Math.floor(word.length / 3)) + 1
  for (const option of options) {
    const d = distance(word.toLowerCase(), option.toLowerCase())
    if (d < bestDistance) {
      best = option
      bestDistance = d
    }
  }
  return best
}

function describe(schema: Schema): string {
  if (schema.enum) return `one of: ${schema.enum.map(String).join(', ')}`
  if (schema.const !== undefined) return `exactly ${JSON.stringify(schema.const)}`
  if (schema.type) return [schema.type].flat().map(article).join(' or ')
  if (schema.required) return `a table with ${schema.required.join(' and ')}`
  return 'a different form'
}

export function validateSchema(value: unknown, schema: Schema, root: Schema = schema, path: Path = []): SchemaIssue[] {
  const issues: SchemaIssue[] = []
  const push = (code: string, message: string, at: Path = path) => issues.push({ path: at, code, message })

  let node = schema
  while (node.$ref) {
    const target = root.definitions?.[node.$ref.replace('#/definitions/', '')]
    if (!target) throw new Error(`unresolved schema reference ${node.$ref}`)
    node = { ...target, description: node.description ?? target.description }
  }

  if (node.anyOf) {
    const branches = node.anyOf.map(branch => validateSchema(value, branch, root, path))
    if (!branches.some(b => b.length === 0)) {
      const onlyRequired = node.anyOf.every(b => b.required && !b.type)
      push('any-of', onlyRequired ? `needs ${node.anyOf.map(b => b.required!.join(' and ')).join(' or ')}` : `must be ${node.anyOf.map(describe).join(' or ')}`)
    }
    return issues
  }

  if (node.const !== undefined && value !== node.const) {
    push('const', `must be ${JSON.stringify(node.const)}`)
    return issues
  }
  if (node.enum && !node.enum.includes(value)) {
    const near = typeof value === 'string' ? closest(value, node.enum.filter((e): e is string => typeof e === 'string')) : undefined
    push('enum', `must be one of: ${node.enum.map(String).join(', ')}${near ? ` (did you mean "${near}"?)` : ''}`)
    return issues
  }
  if (node.type) {
    const types = [node.type].flat()
    if (!types.some(t => matchesType(value, t))) {
      push('type', `expected ${types.map(article).join(' or ')}, found ${typeName(value)}`)
      return issues
    }
  }

  if (typeof value === 'string') {
    if (node.minLength !== undefined && value.length < node.minLength) push('min-length', 'must not be empty')
    if (node.pattern && !new RegExp(node.pattern).test(value)) {
      push('pattern', `"${value}" does not match the required form ${node.pattern}`)
    }
  }
  if (typeof value === 'number') {
    if (node.minimum !== undefined && value < node.minimum) push('minimum', `must be at least ${node.minimum}`)
    if (node.maximum !== undefined && value > node.maximum) push('maximum', `must be at most ${node.maximum}`)
  }
  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) push('min-items', `needs at least ${node.minItems} items`)
    if (node.items) value.forEach((item, i) => issues.push(...validateSchema(item, node.items!, root, [...path, i])))
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>
    for (const key of node.required ?? []) {
      if (!(key in object)) push('required', `missing required key "${key}"`)
    }
    const known = Object.keys(node.properties ?? {})
    for (const [key, child] of Object.entries(object)) {
      const childSchema = node.properties?.[key]
      if (childSchema) {
        issues.push(...validateSchema(child, childSchema, root, [...path, key]))
      } else if (node.additionalProperties === false) {
        const near = closest(key, known)
        push('unknown-key', `unknown key "${key}"${near ? ` (did you mean "${near}"?)` : known.length ? ` (known keys: ${known.join(', ')})` : ''}`, [...path, key])
      } else if (typeof node.additionalProperties === 'object') {
        issues.push(...validateSchema(child, node.additionalProperties, root, [...path, key]))
      }
    }
  }
  return issues
}
