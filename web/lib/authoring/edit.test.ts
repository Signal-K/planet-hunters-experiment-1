import { describe, expect, it } from 'vitest'
import { applyEdit, applyEdits } from './edit.ts'
import { parseToml, spanForPath, tomlValue } from './toml.ts'

const SAMPLE = `# scene header
format = 1
id = "demo" # trailing note

[preview]
route = "hub"

# the first object
[[objects]]
id = "hud"
slot = "hud"
rect = { x = 0.02, y = 0.02, w = 0.96, h = 0.1 } # keep me

[[objects]]
id = "dock"
x = 3

[objects.body]
vx = 1

[[objects]]
id = "last"
`

const value = (text: string) => {
  const parsed = parseToml(text)
  if (!parsed.ok) throw new Error(parsed.error.message)
  return parsed.doc.value as { objects: { id: string; rect?: Record<string, number>; slot?: string; kind?: string; body?: unknown }[] } & Record<string, unknown>
}
const ok = (text: string, op: Parameters<typeof applyEdit>[1]) => {
  const result = applyEdit(text, op)
  if (!result.ok) throw new Error(result.error)
  return result.text
}

describe('parseToml', () => {
  it('maps paths to source ranges and reports 1-based syntax errors', () => {
    const parsed = parseToml(SAMPLE)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const span = spanForPath(parsed.doc, ['objects', 0, 'rect', 'x'])
    expect(SAMPLE.slice(span.start, span.end)).toContain('x = 0.02')
    expect(span.line).toBe(12)
    const bad = parseToml('a = 1\nb = \n')
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error.line).toBeGreaterThanOrEqual(2)
  })

  it('falls back to the nearest existing ancestor for a missing path', () => {
    const parsed = parseToml(SAMPLE)
    if (!parsed.ok) throw new Error('parse')
    const span = spanForPath(parsed.doc, ['objects', 1, 'nope'])
    expect(span.line).toBe(14)
  })
})

describe('tomlValue', () => {
  it('writes one-line TOML for every supported value', () => {
    expect(tomlValue('a "q"\n')).toBe('"a \\"q\\"\\n"')
    expect(tomlValue([1, 2.5, 'x'])).toBe('[1, 2.5, "x"]')
    expect(tomlValue({ x: 0.1, y: 2 })).toBe('{ x = 0.1, y = 2 }')
    expect(() => tomlValue(Number.NaN)).toThrow()
    expect(() => tomlValue(null)).toThrow()
  })
})

describe('set', () => {
  it('replaces only the value bytes and keeps comments', () => {
    const next = ok(SAMPLE, { op: 'set', path: ['objects', 0, 'rect', 'x'], value: 0.25 })
    expect(next).toContain('rect = { x = 0.25, y = 0.02, w = 0.96, h = 0.1 } # keep me')
    expect(next.replace('0.25', '0.02')).toBe(SAMPLE)
  })

  it('keeps the trailing comment when a top-level value changes', () => {
    const next = ok(SAMPLE, { op: 'set', path: ['id'], value: 'renamed' })
    expect(next).toContain('id = "renamed" # trailing note')
  })

  it('adds a missing key after the last pair of its own block, before sub-tables', () => {
    const next = ok(SAMPLE, { op: 'set', path: ['objects', 1, 'kind'], value: 'ui' })
    expect(next).toContain('id = "dock"\nx = 3\nkind = "ui"\n\n[objects.body]')
    expect(value(next).objects[1]).toMatchObject({ id: 'dock', kind: 'ui', body: { vx: 1 } })
  })

  it('adds a missing top-level key after the existing ones', () => {
    const next = ok(SAMPLE, { op: 'set', path: ['title'], value: 'Demo' })
    expect(next).toContain('id = "demo" # trailing note\ntitle = "Demo"\n')
    expect(value(next).title).toBe('Demo')
  })

  it('creates a missing table at the end of the file', () => {
    const next = ok(SAMPLE, { op: 'set', path: ['runtime', 'composition'], value: 'dom' })
    expect(next.endsWith('[runtime]\ncomposition = "dom"\n')).toBe(true)
    expect(value(next).runtime).toEqual({ composition: 'dom' })
  })

  it('merges a missing key into an inline table', () => {
    const next = ok(SAMPLE, { op: 'set', path: ['objects', 0, 'rect', 'z'], value: 1 })
    expect(value(next).objects[0].rect).toEqual({ x: 0.02, y: 0.02, w: 0.96, h: 0.1, z: 1 })
  })

  it('refuses a table target, a bad index and an orphan path', () => {
    expect(applyEdit(SAMPLE, { op: 'set', path: ['preview'], value: 1 }).ok).toBe(false)
    expect(applyEdit(SAMPLE, { op: 'set', path: ['objects', 9], value: 1 }).ok).toBe(false)
    expect(applyEdit(SAMPLE, { op: 'set', path: ['objects', 9, 'id'], value: 'x' }).ok).toBe(false)
  })

  it('handles files with no trailing newline', () => {
    const next = ok('[a]\nx = 1', { op: 'set', path: ['a', 'y'], value: 2 })
    expect(next).toBe('[a]\nx = 1\ny = 2\n')
  })
})

describe('remove', () => {
  it('deletes a key line together with the comment attached above it', () => {
    const withComment = SAMPLE.replace('slot = "hud"', '# which slot\nslot = "hud"')
    const next = ok(withComment, { op: 'remove', path: ['objects', 0, 'slot'] })
    expect(next).not.toContain('which slot')
    expect(value(next).objects[0]).toEqual({ id: 'hud', rect: { x: 0.02, y: 0.02, w: 0.96, h: 0.1 } })
  })

  it('removes a middle table with its sub-table and leaves neighbours untouched', () => {
    const next = ok(SAMPLE, { op: 'remove', path: ['objects', 1] })
    expect(value(next).objects.map(o => o.id)).toEqual(['hud', 'last'])
    expect(next).not.toContain('[objects.body]')
    expect(next).toContain('# the first object')
  })

  it('removes the first table with the comment above it', () => {
    const next = ok(SAMPLE, { op: 'remove', path: ['objects', 0] })
    expect(next).not.toContain('the first object')
    expect(value(next).objects.map(o => o.id)).toEqual(['dock', 'last'])
  })

  it('removes the last table and trims the blank tail', () => {
    const next = ok(SAMPLE, { op: 'remove', path: ['objects', 2] })
    expect(next.endsWith('vx = 1\n')).toBe(true)
  })

  it('removes an inline member and an array element by rewriting the parent', () => {
    const a = ok(SAMPLE, { op: 'remove', path: ['objects', 0, 'rect', 'h'] })
    expect(value(a).objects[0].rect).toEqual({ x: 0.02, y: 0.02, w: 0.96 })
    const b = ok('list = [1, 2, 3]\n', { op: 'remove', path: ['list', 1] })
    expect(value(b).list).toEqual([1, 3])
  })

  it('refuses an unknown path', () => {
    expect(applyEdit(SAMPLE, { op: 'remove', path: ['objects', 7] }).ok).toBe(false)
  })
})

describe('append', () => {
  it('adds a table after the last element and its sub-tables', () => {
    const next = ok(SAMPLE, { op: 'append', path: ['objects'], value: { id: 'new', kind: 'ui', rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.1 } } })
    const objects = value(next).objects
    expect(objects.map(o => o.id)).toEqual(['hud', 'dock', 'last', 'new'])
    expect(objects[3].rect).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.1 })
    expect(next).toContain('id = "last"\n\n[[objects]]\nid = "new"')
  })

  it('creates the array when it does not exist yet', () => {
    const next = ok('id = "x"\n', { op: 'append', path: ['states'], value: { id: 'a', preset: 'm1-hub' } })
    expect(next).toBe('id = "x"\n\n[[states]]\nid = "a"\npreset = "m1-hub"\n')
  })

  it('keeps the new block before later non-array sections only when the array is last', () => {
    const next = ok('[[a]]\nx = 1\n\n[b]\ny = 2\n', { op: 'append', path: ['a'], value: { x: 2 } })
    expect(value(next)).toEqual({ a: [{ x: 1 }, { x: 2 }], b: { y: 2 } })
  })
})

describe('applyEdits', () => {
  it('applies a batch in order and stops at the first failure', () => {
    const next = applyEdits(SAMPLE, [
      { op: 'set', path: ['objects', 0, 'slot'], value: 'objective' },
      { op: 'append', path: ['objects'], value: { id: 'extra' } },
    ])
    expect(next.ok && value(next.text).objects[3]).toEqual({ id: 'extra' })
    expect(applyEdits(SAMPLE, [{ op: 'remove', path: ['nope'] }, { op: 'set', path: ['id'], value: 'x' }]).ok).toBe(false)
  })
})
