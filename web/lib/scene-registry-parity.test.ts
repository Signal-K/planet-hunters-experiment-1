import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEV_GROUPS, SANDBOX_FIXTURES } from './devPresets'
import { readdirSync } from 'node:fs'

// qa/scenes.json is the one launch registry. Every row must resolve on both builds,
// so web and iOS can never silently drift apart.
const root = join(process.cwd(), '..')
const registry = JSON.parse(readFileSync(join(root, 'qa/scenes.json'), 'utf8')).scenes as {
  id: string; web?: string; native?: string
}[]
const swift = ['SceneCatalog.swift', 'SceneCatalog+BaseWorld.swift']
  .map(f => readFileSync(join(root, 'native/App', f), 'utf8')).join('\n')
const nativeIds = new Set([...swift.matchAll(/scene\("([^"\\]+)"/g)].map(m => m[1]))
const webKeys = new Set<string>([...DEV_GROUPS.flatMap(g => g.shots.map(shot => shot.key)), ...SANDBOX_FIXTURES])

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
  it('every authored scene has a registry row', () => {
    const tomls = readdirSync(join(root, 'shared/authoring/scenes')).filter(f => f.endsWith('.toml')).map(f => f.slice(0, -5))
    const ids = new Set(registry.map(s => s.id))
    expect(tomls.filter(id => !ids.has(id))).toEqual([])
  })
  it('every authored scene has a standalone fixture file', () => {
    const tomls = readdirSync(join(root, 'shared/authoring/scenes')).filter(f => f.endsWith('.toml')).map(f => f.slice(0, -5))
    const authored = new Set(tomls)
    expect(tomls.filter(id => !existsSync(join(root, 'shared/authoring/fixtures', `${id}.toml`)))).toEqual([])
    expect(registry.filter(({ id }) => authored.has(id) && !existsSync(join(root, 'shared/authoring/fixtures', `${id}.toml`))).map(({ id }) => id)).toEqual([])
  })
})
