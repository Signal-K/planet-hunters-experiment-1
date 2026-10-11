import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getHelpTopic } from './help/topics'
import { SCENE_NAMES } from './ui-strings'

const retiredHomeTitle = new RegExp(
  ['Earth', 'Base'].join(' ') + '|' + ['Earth', 'HQ'].join(' '),
  'i',
)

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'archive') continue
    const path = join(dir, entry)
    const info = statSync(path)
    if (info.isDirectory()) walk(path, acc)
    else if (/\.(ts|tsx|swift|json)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) acc.push(path)
  }
  return acc
}

describe('scene names', () => {
  it('keeps one canonical table', () => {
    const table = JSON.parse(readFileSync(resolveTable(), 'utf8')) as Record<string, string>
    expect(table).toEqual({ ...SCENE_NAMES })
    expect(SCENE_NAMES.base).toBe('Base')
    const native = readFileSync(join(process.cwd(), '../native/App/Strings.swift'), 'utf8')
    for (const [key, name] of Object.entries(SCENE_NAMES)) {
      expect(native, key).toContain(`"${name}"`)
    }
  })

  it("rejects retired home titles 'Earth Base' and 'Earth HQ'", () => {
    const roots = ['app', 'components', 'lib', '../native/App', '../shared/layout'].map(dir => join(process.cwd(), dir))
    const failures: string[] = []
    for (const root of roots) {
      for (const file of walk(root)) {
        const source = stripComments(readFileSync(file, 'utf8'))
        if (retiredHomeTitle.test(source)) failures.push(relative(process.cwd(), file))
      }
    }
    expect(failures).toEqual([])
  })

  it('uses the home scene name for accessibility, not a visible help title', () => {
    const hub = readFileSync(join(process.cwd(), 'components/game/screens/HubScreen.tsx'), 'utf8')
    expect(hub).toContain('aria-label={SCENE_NAMES.base}')
    expect(getHelpTopic('hub')?.title).not.toBe(SCENE_NAMES.base)
    expect(getHelpTopic('hub')?.title).not.toMatch(retiredHomeTitle)
  })

  it('keeps the planet out of the base sky', () => {
    const web = readFileSync(join(process.cwd(), 'components/game/hub/HubWorldBackground.tsx'), 'utf8')
    const native = readFileSync(join(process.cwd(), '../native/App/Terrain.swift'), 'utf8')
    expect(web).not.toMatch(/PlanetBackdrop|hub-planet/)
    expect(native).not.toMatch(/showsPlanet|struct Planet/)
  })
})

function resolveTable(): string {
  return join(process.cwd(), 'lib/scene-names.json')
}
