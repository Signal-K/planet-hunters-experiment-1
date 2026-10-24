import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEV_GROUPS } from './devPresets'

// qa/scenes.json is the one launch registry. Every row must resolve on both builds,
// so web and iOS can never silently drift apart.
const root = join(process.cwd(), '..')
const registry = JSON.parse(readFileSync(join(root, 'qa/scenes.json'), 'utf8')).scenes as {
  id: string; web?: string; native?: string
}[]
const swift = ['SceneCatalog.swift', 'SceneCatalog+BaseWorld.swift']
  .map(f => readFileSync(join(root, 'native/App', f), 'utf8')).join('\n')
const nativeIds = new Set([...swift.matchAll(/scene\("([^"\\]+)"/g)].map(m => m[1]))
const webKeys = new Set(DEV_GROUPS.flatMap(g => g.shots.map(shot => shot.key)))

describe('scene registry parity', () => {
  it('has unique ids', () => {
    const ids = registry.map(s => s.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })
  it('every iOS fixture exists in SceneCatalog', () => {
    expect(registry.filter(s => !s.native || !nativeIds.has(s.native)).map(s => `${s.id} -> ${s.native}`)).toEqual([])
  })
  it('every web fixture exists as a dev preset', () => {
    expect(registry.filter(s => !s.web || !webKeys.has(s.web)).map(s => `${s.id} -> ${s.web}`)).toEqual([])
  })
})
