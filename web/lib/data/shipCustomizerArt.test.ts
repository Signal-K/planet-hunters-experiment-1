import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CUSTOMIZER_PARTS, customizerPartById } from './shipCustomizer'

const V2_PART_IDS = [
  'ablative-shield-t1',
  'ceramic-shield-t1',
  'cockpit-command-t1',
  'crew-transport-t2',
  'crew-transport-t5',
  'guidance-cockpit-t1',
  'heavy-fairing-t1',
  'kerosene-stage-t1',
  'lander-module-t1',
  'lox-lh2-stage-t1',
  'magnetic-port-t1',
  'mining-payload-t1',
  'pulse-thruster-t1',
  'standard-fairing-t1',
  'standard-port-t1',
  'strap-booster-t1',
  'vulcan-booster-t1',
] as const

const publicFile = (url: string) => path.join(__dirname, '../../public', url)

describe('rocket sprites v2 customizer art (SSL-457)', () => {
  it.each(V2_PART_IDS)('%s uses its own v2 icon and detail art', id => {
    const part = customizerPartById(id)
    expect(part?.img).toBe(`/game/assets/rockets/parts/${id}_icon.png`)
    expect(part?.detailImg).toBe(`/game/assets/rockets/parts/${id}.png`)
  })

  it('boosters no longer borrow mining_room art', () => {
    for (const id of ['strap-booster-t1', 'vulcan-booster-t1']) {
      expect(customizerPartById(id)?.img).not.toMatch(/mining_room/)
      expect(customizerPartById(id)?.detailImg).not.toMatch(/mining_room/)
    }
  })

  it('every customizer part image resolves to a file on disk', () => {
    for (const part of CUSTOMIZER_PARTS) {
      for (const url of [part.img, part.detailImg]) {
        if (url) expect(existsSync(publicFile(url)), `${part.id}: ${url}`).toBe(true)
      }
    }
  })

  it('sibling parts of a kind get different art', () => {
    const seen = new Map<string, string>()
    for (const id of V2_PART_IDS) {
      const img = customizerPartById(id)!.img!
      expect(seen.has(img), `${id} duplicates ${seen.get(img)}`).toBe(false)
      seen.set(img, id)
    }
  })
})
