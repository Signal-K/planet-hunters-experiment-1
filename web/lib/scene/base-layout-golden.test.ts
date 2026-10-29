// SSL-642 spike: the Go core (shared/core) must reproduce this layout exactly. This file is the reference:
// it computes the Base structure rectangles with the real web functions at three viewports and pins them to
// shared/core/testdata/base-layout.golden.json. `shared/core` has a Go test that reads the same file.
// Regenerate after an intentional layout change with `UPDATE_GOLDEN=1 npm run test:file -- lib/scene/base-layout-golden.test.ts`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { displaySite, homeCenter, homeSite, kitScale, spriteCenterOffset, structureSprite } from './base-site'

const GOLDEN = resolve(__dirname, '../../../shared/core/testdata/base-layout.golden.json')
const VIEWS = [{ w: 390, h: 844 }, { w: 926, h: 428 }, { w: 1440, h: 900 }]
const BASES = [[], ['launchpad'], ['launchpad', 'hangar'], ['launchpad', 'hangar', 'control-station', 'market']]
const round = (n: number) => Math.round(n * 1000) / 1000

function layout(kinds: string[], view: { w: number; h: number }) {
  const scale = kitScale(view)
  const center = homeCenter(kinds, view.w / scale)
  const rects = kinds.flatMap(kind => {
    const site = homeSite(kind)
    const sprite = structureSprite(kind)
    if (!site || !sprite || sprite.width == null || sprite.height == null) return []
    const x = displaySite(site).x + spriteCenterOffset(sprite)
    return [{ kind, centerX: round((x - center) * scale + view.w / 2), width: round(sprite.width * scale), height: round(sprite.height * scale) }]
  })
  return { scale, center: round(center), rects }
}

const build = () => VIEWS.flatMap(view => BASES.map(kinds => ({ view, kinds, ...layout(kinds, view) })))

describe('Base layout golden (reference for the Go core)', () => {
  it('matches the committed golden file', () => {
    const fresh = build()
    if (process.env.UPDATE_GOLDEN || !existsSync(GOLDEN)) writeFileSync(GOLDEN, `${JSON.stringify(fresh, null, 2)}\n`)
    expect(JSON.parse(readFileSync(GOLDEN, 'utf8'))).toEqual(fresh)
  })
})
