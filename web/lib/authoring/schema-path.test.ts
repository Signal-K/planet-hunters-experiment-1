import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defaultFor, fieldKind, schemaAt } from './schema-path.ts'
import type { Schema } from './schema.ts'

const load = (name: string): Schema => JSON.parse(readFileSync(join(process.cwd(), '..', 'shared/authoring/schema', `${name}.schema.json`), 'utf8'))

describe('schemaAt and fieldKind', () => {
  const scene = load('scene')
  const mission = load('mission')
  const world = load('world')

  it('finds an object field through the array items and the $ref', () => {
    expect(schemaAt(scene, ['objects', 3, 'slot'])?.enum).toContain('primaryAction')
    expect(fieldKind(schemaAt(scene, ['objects', 0, 'slot']), 'hud', 'slot')).toBe('enum')
    expect(fieldKind(schemaAt(scene, ['objects', 0, 'rect']), { x: 0 }, 'rect')).toBe('rect')
    expect(fieldKind(schemaAt(scene, ['objects', 0, 'components']), ['A'], 'components')).toBe('strings')
    expect(fieldKind(schemaAt(scene, ['objects', 0, 'note']), 'x', 'note')).toBe('text')
    expect(fieldKind(schemaAt(scene, ['objects', 0, 'id']), 'x', 'id')).toBe('string')
  })

  it('picks number, boolean and dictionary editors for a mission', () => {
    expect(fieldKind(schemaAt(mission, ['requires', 'cargo_min']), 1, 'cargo_min')).toBe('integer')
    expect(fieldKind(schemaAt(mission, ['locked']), false, 'locked')).toBe('boolean')
    expect(fieldKind(schemaAt(mission, ['requires', 'minerals']), { iron: 1 }, 'minerals')).toBe('dictionary')
    expect(schemaAt(mission, ['requires', 'minerals', 'iron'])?.minimum).toBe(1)
  })

  it('walks into world entities and dictionaries of sprites', () => {
    expect(schemaAt(world, ['entities', 1, 'depth'])?.maximum).toBe(1)
    expect(schemaAt(world, ['sprites', 'escarpment-a-mid', 'w'])?.type).toBe('number')
    expect(fieldKind(schemaAt(world, ['entities', 1, 'body']), { wind: 1 }, 'body')).toBe('table')
    expect(schemaAt(world, ['entities', 0, 'nope'])).toBeUndefined()
  })

  it('offers a sensible starting value for a new field', () => {
    expect(defaultFor(schemaAt(scene, ['objects', 0, 'status']))).toBe('implemented')
    expect(defaultFor(schemaAt(scene, ['objects', 0, 'rect']))).toEqual({ x: 0.1, y: 0.1, w: 0.3, h: 0.1 })
    expect(defaultFor(schemaAt(mission, ['locked']))).toBe(false)
    expect(defaultFor(schemaAt(mission, ['requires', 'drill_tier']))).toBe(1)
  })
})
