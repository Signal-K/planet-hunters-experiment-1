import { describe, expect, it } from 'vitest'
import { assertSolarFieldRestored, readSolarFieldIdentity, writeSolarFieldIdentity } from './solarFieldIdentity'

const identity = { kind: 'solar', version: 1, bodyId: 'mars', zone: 'east', seed: 42 } as const
const snapshot = JSON.stringify({ config: { body: { coreDEM: { size: 2, heights: [1, 2, 3, 4], surfaceMaterials: [1, 2, 3, 4] } } } })

describe('solar field snapshot identity', () => {
  it('preserves the sampled field and identifies it after a round trip', () => {
    const saved = writeSolarFieldIdentity(snapshot, identity)
    expect(readSolarFieldIdentity(saved)).toEqual(identity)
    expect(() => assertSolarFieldRestored(saved, snapshot)).not.toThrow()
  })

  it('leaves legacy snapshots alone', () => {
    expect(readSolarFieldIdentity(snapshot)).toBeUndefined()
    expect(readSolarFieldIdentity()).toBeUndefined()
  })

  it('rejects invalid or incomplete marked snapshots', () => {
    const saved = JSON.parse(writeSolarFieldIdentity(snapshot, identity))
    saved.config.body.coreDEM.surfaceMaterials.pop()
    expect(() => readSolarFieldIdentity(JSON.stringify(saved))).toThrow()
    saved.landnamTerrain.version = 2
    expect(() => readSolarFieldIdentity(JSON.stringify(saved))).toThrow()
  })

  it('rejects a fallback or changed terrain after restore', () => {
    const saved = writeSolarFieldIdentity(snapshot, identity)
    expect(() => assertSolarFieldRestored(saved)).toThrow()
    const changed = JSON.parse(snapshot)
    changed.config.body.coreDEM.heights[0] = 99
    expect(() => assertSolarFieldRestored(saved, JSON.stringify(changed))).toThrow()
  })
})
