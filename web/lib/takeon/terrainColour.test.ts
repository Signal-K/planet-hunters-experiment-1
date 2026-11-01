import { describe, expect, it } from 'vitest'
import { applyTerrainLook, frostAmount, hexToRgb, scorchAmount, terrainLookForTarget } from './terrainColour'

const body = (id: string, type: 'planet' | 'moon' | 'asteroid', archetype?: 'C' | 'S' | 'M' | 'icy') => ({ id, type: type === 'asteroid' ? 'asteroid' as const : 'planet' as const, archetype })
const warmth = (hex: string) => { const [r, , b] = hexToRgb(hex); return r - b }
const light = (hex: string) => hexToRgb(hex).reduce((a, b) => a + b, 0)

describe('terrainLookForTarget', () => {
  it('gives each kind of body its own ground, not one ice ramp', () => {
    const grounds = ['mars', 'moon', 'europa', 'io', 'bennu', 'eros', 'psyche'].map(id => {
      const t = id === 'bennu' ? body(id, 'asteroid', 'C') : id === 'eros' ? body(id, 'asteroid', 'S') : id === 'psyche' ? body(id, 'asteroid', 'M') : body(id, id === 'mars' ? 'planet' : 'moon')
      return terrainLookForTarget(t).ground[0]
    })
    expect(new Set(grounds).size).toBe(grounds.length)
  })

  it('reads Mars as rusty under a dusty sky and Europa as ice under a black sky', () => {
    const mars = terrainLookForTarget(body('mars', 'planet'))
    const europa = terrainLookForTarget(body('europa', 'moon'))
    expect(warmth(mars.ground[0])).toBeGreaterThan(80)
    expect(mars.atmosphere).toBe('thin')
    expect(warmth(europa.ground[0])).toBeLessThan(0)
    expect(europa.atmosphere).toBe('none')
    expect(light(europa.sky)).toBeLessThan(80)
  })

  it('makes a carbonaceous asteroid darker than a stony one', () => {
    const c = terrainLookForTarget(body('bennu', 'asteroid', 'C')).ground[0]
    const s = terrainLookForTarget(body('eros', 'asteroid', 'S')).ground[0]
    expect(light(c)).toBeLessThan(light(s))
  })
})

describe('conditions', () => {
  it('frosts only cold bodies with volatiles and scorches only hot ones', () => {
    expect(frostAmount(-100, true)).toBe(0)
    expect(frostAmount(-200, true)).toBeCloseTo(0.3)
    expect(frostAmount(-200, false)).toBe(0)
    expect(scorchAmount(100)).toBe(0)
    expect(scorchAmount(460)).toBeCloseTo(0.25)
  })
})

describe('applyTerrainLook', () => {
  it('repaints stock ground from the original colours on every mount and keeps ores their own colour', () => {
    const engine = { MATERIALS: {
      1: { name: 'Regolith', colors: ['#d99a55', '#a86f38', '#7d5230'] },
      5: { name: 'Iron ore', colors: ['#c96f4a', '#96502f', '#703a24'] },
      40: { name: 'Lava fields', colors: ['#111111', '#111111', '#111111'] },
    } }
    const mars = terrainLookForTarget(body('mars', 'planet'))
    const moon = terrainLookForTarget(body('moon', 'moon'))
    applyTerrainLook(engine, mars)
    expect(engine.MATERIALS[1].colors[0]).toBe(mars.ground[0])
    applyTerrainLook(engine, moon)
    expect(engine.MATERIALS[1].colors[0]).toBe(moon.ground[0])
    expect(engine.MATERIALS[5].colors[0]).toBe('#a8543a')
    expect(engine.MATERIALS[40].colors[0]).toBe('#111111')
  })
})
