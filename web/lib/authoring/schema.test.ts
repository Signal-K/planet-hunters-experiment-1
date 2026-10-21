import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateSchema } from './schema.ts'
import type { Schema } from './schema.ts'

const load = (name: string): Schema => JSON.parse(readFileSync(join(process.cwd(), '..', 'shared/authoring/schema', `${name}.schema.json`), 'utf8'))
const messages = (value: unknown, schema: Schema) => validateSchema(value, schema).map(i => `${i.path.join('.')}: ${i.message}`)

describe('validateSchema', () => {
  const mission = load('mission')
  const good = {
    format: 1, id: 'm1', title: 'T', brief: 'B', tag: 'FREE OPS', difficulty: 'L2', locked: false, sequence: 'free-ops',
    requires: { minerals: { nickel: 1 }, cargo_min: 1, drill_tier: 1, max_orbit: 2 },
    payout: { francs: 0, affinity: 0 },
  }

  it('accepts a valid mission', () => {
    expect(messages(good, mission)).toEqual([])
    expect(messages({ ...good, sequence: 4, payout: { floor_sequence: 3, affinity: 3 } }, mission)).toEqual([])
  })

  it('names the key and suggests the closest known one', () => {
    expect(messages({ ...good, tittle: 'x' }, mission)).toContain('tittle: unknown key "tittle" (did you mean "title"?)')
  })

  it('reports type, range, pattern and enum problems in plain language', () => {
    const issues = messages({ ...good, difficulty: 'hard', requires: { ...good.requires, cargo_min: -1, drill_tier: 'x' }, locked: 'no' }, mission)
    expect(issues).toContain('difficulty: "hard" does not match the required form ^L[1-9]$')
    expect(issues).toContain('requires.cargo_min: must be at least 0')
    expect(issues).toContain('requires.drill_tier: expected a whole number, found a string')
    expect(issues).toContain('locked: expected true or false, found a string')
  })

  it('explains an anyOf that nothing satisfies', () => {
    expect(messages({ ...good, sequence: 'sometime' }, mission)).toContain('sequence: must be a whole number or one of: transport, free-ops')
    expect(messages({ ...good, payout: { affinity: 1 } }, mission)).toContain('payout: needs francs or floor_sequence')
  })

  it('reports missing required keys on the owning table', () => {
    const { payout: _payout, ...rest } = good
    expect(messages(rest, mission)).toContain(': missing required key "payout"')
  })

  it('follows $ref into definitions and validates every array item', () => {
    const scene = load('scene')
    const issues = messages(
      { format: 1, id: 'x', type: 'base', name: 'X', runtime: { composition: 'dom' }, preview: { route: 'hub' }, objects: [{ id: 'ok', kind: 'ui', rect: { x: 0, y: 0, w: 2, h: 1 } }, { id: 'Bad', kind: 'widget' }] },
      scene,
    )
    expect(issues).toContain('objects.0.rect.w: must be at most 1')
    expect(issues).toContain('objects.1.id: "Bad" does not match the required form ^[a-z0-9][a-z0-9-]*$')
    expect(issues.some(i => i.startsWith('objects.1.kind: must be one of:'))).toBe(true)
  })
})
