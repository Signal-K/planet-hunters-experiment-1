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

  it('persists and validates the sampled material colours', () => {
    const withPalette = { ...identity, palette: { '110': ['#aabbcc', '#123456', '#abcdef'] as [string, string, string] } }
    expect(readSolarFieldIdentity(writeSolarFieldIdentity(snapshot, withPalette))?.palette).toEqual(withPalette.palette)
    const saved = JSON.parse(writeSolarFieldIdentity(snapshot, withPalette))
    saved.landnamTerrain.palette['110'][0] = 'invalid'
    expect(() => readSolarFieldIdentity(JSON.stringify(saved))).toThrow('palette')
  })

  it('rejects a fallback or changed terrain after restore', () => {
    const saved = writeSolarFieldIdentity(snapshot, identity)
    expect(() => assertSolarFieldRestored(saved)).toThrow()
    const changed = JSON.parse(snapshot)
    changed.config.body.coreDEM.heights[0] = 99
    expect(() => assertSolarFieldRestored(saved, JSON.stringify(changed))).toThrow()
  })

  it('refuses a field that restores its surface but loses a mined voxel', () => {
    const mined = { ...JSON.parse(snapshot), edits: { '4,5,6': 0 } }
    const saved = writeSolarFieldIdentity(JSON.stringify(mined), identity)
    expect(() => assertSolarFieldRestored(saved, JSON.stringify(mined))).not.toThrow()
    expect(() => assertSolarFieldRestored(saved, snapshot)).toThrow('could not be restored safely')
  })

  it('refuses to resume a field if the rover hold was lost', () => {
    const mined = { ...JSON.parse(snapshot), rover: { cargo: { 'landnam:iron': 1 }, cargoUsed: 1, pos: { x: 1, y: 2 } } }
    const saved = writeSolarFieldIdentity(JSON.stringify(mined), identity)
    expect(() => assertSolarFieldRestored(saved, JSON.stringify(mined))).not.toThrow()
    expect(() => assertSolarFieldRestored(saved, JSON.stringify({ ...mined, rover: { ...mined.rover, cargo: {}, cargoUsed: 0 } }))).toThrow()
  })
})
