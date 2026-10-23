import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUILD_SEQUENCES, CUSTOMIZER_PARTS } from './shipCustomizer'

// SSL-667: native mirrors the customizer table by hand (LandnamCore ShipCustomizer.swift). Fail when the two drift.
const swift = readFileSync(resolve(__dirname, '../../../native/LandnamCore/Sources/LandnamCore/Data/ShipCustomizer.swift'), 'utf8')

describe('native ship customizer parity', () => {
  it('lists every web part with the same room, name, price and unlock', () => {
    const native = [...swift.matchAll(/Part\(id: "([^"]+)", kind: "([^"]+)", name: "([^"]+)", price: ([\d_]+), unlockedAtMissions: (\d+)\)/g)]
      .map(([, id, kind, name, price, unlock]) => ({ id, kind, name, price: Number(price.replaceAll('_', '')), unlock: Number(unlock) }))
    const web = CUSTOMIZER_PARTS.map(p => ({ id: p.id, kind: p.kind, name: p.name, price: p.price, unlock: p.unlockedAtMissions ?? 0 }))
    expect(native).toEqual(web)
  })

  it('grows the hull through the same room sequences', () => {
    for (const [tier, rooms] of Object.entries(BUILD_SEQUENCES)) {
      expect(swift).toContain(`${tier}: [${rooms.map(room => `"${room}"`).join(', ')}]`)
    }
  })
})
