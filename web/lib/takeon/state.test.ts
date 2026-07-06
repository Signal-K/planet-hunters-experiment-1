import { describe, expect, it } from 'vitest'
import {
  createInitialTakeonState,
  exploreTile,
  parseTakeonState,
  returnToBase,
  serializeTakeonState,
  takeonCapacitySummary,
} from './state'

describe('takeon demo state', () => {
  it('creates an offline-first exploration state with base already explored', () => {
    const state = createInitialTakeonState('2026-07-06T00:00:00.000Z')
    expect(state.schemaVersion).toBe(1)
    expect(state.rover.energy).toBe(state.rover.energyCapacity)
    expect(state.exploredTileIds).toEqual(['base'])
  })

  it('explores a tile and consumes rover capacity', () => {
    const initial = createInitialTakeonState()
    const result = exploreTile(initial, 'basalt-plain', '2026-07-06T01:00:00.000Z')
    expect(result.ok).toBe(true)
    expect(result.state.rover.energy).toBe(86)
    expect(result.state.rover.data).toBe(2)
    expect(result.state.rover.samples).toBe(1)
    expect(result.state.exploredTileIds).toContain('basalt-plain')
  })

  it('blocks duplicate surveys and preserves state', () => {
    const first = exploreTile(createInitialTakeonState(), 'basalt-plain').state
    const second = exploreTile(first, 'basalt-plain')
    expect(second.ok).toBe(false)
    expect(second.state).toBe(first)
  })

  it('returns to base, banks collected capacity, and recharges', () => {
    const explored = exploreTile(createInitialTakeonState(), 'north-crater').state
    const result = returnToBase(explored)
    expect(result.state.rover.tileId).toBe('base')
    expect(result.state.rover.energy).toBe(100)
    expect(result.state.rover.data).toBe(0)
    expect(result.state.bankedData).toBe(4)
    expect(result.state.bankedSamples).toBe(2)
  })

  it('round-trips persisted state and rejects incompatible payloads', () => {
    const state = exploreTile(createInitialTakeonState(), 'glass-ridge').state
    expect(parseTakeonState(serializeTakeonState(state))?.exploredTileIds).toContain('glass-ridge')
    expect(parseTakeonState('{"schemaVersion":2}')).toBeNull()
    expect(parseTakeonState('not json')).toBeNull()
  })

  it('summarizes capacity for the demo HUD', () => {
    const state = exploreTile(createInitialTakeonState(), 'shadow-pocket').state
    expect(takeonCapacitySummary(state)).toMatchObject({
      energyPct: 66,
      dataPct: 63,
      samplePct: 40,
    })
  })
})
