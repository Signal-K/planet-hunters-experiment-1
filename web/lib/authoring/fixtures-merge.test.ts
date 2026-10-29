import { describe, expect, it } from 'vitest'
import { fixturesFile, markerFor, readSceneText, remapDiagnostics, splitSceneText } from './fixtures-merge.ts'
import { loadContext } from './validate.ts'
import { join } from 'node:path'

const root = join(import.meta.dirname, '../../..')

describe('scene fixtures', () => {
  it('finds the sibling file only for scene scripts', () => {
    expect(fixturesFile('shared/authoring/scenes/hub.toml')).toBe('shared/authoring/fixtures/hub.toml')
    expect(fixturesFile('shared/authoring/missions/x.toml')).toBeNull()
  })

  it('merges and splits back to the same two texts', () => {
    const overlay = { 'shared/authoring/scenes/a.toml': 'id = "a"\n', 'shared/authoring/fixtures/a.toml': '[[things]]\nid = "t"\n' }
    const merged = readSceneText(root, 'shared/authoring/scenes/a.toml', overlay)
    expect(merged).toContain(markerFor('shared/authoring/fixtures/a.toml'))
    const parts = splitSceneText(merged)
    expect(parts.scene).toBe('id = "a"\n')
    expect(parts.fixtures).toEqual({ file: 'shared/authoring/fixtures/a.toml', text: '[[things]]\nid = "t"\n' })
  })

  it('points diagnostics after the marker at the fixtures file and its own line', () => {
    const merged = 'id = "a"\n\n' + markerFor('shared/authoring/fixtures/a.toml') + '[[things]]\nid = "t"\n'
    const d = { file: 'shared/authoring/scenes/a.toml', line: 5, endLine: 5, column: 1, endColumn: 2, severity: 'error', code: 'x', message: 'm' } as never
    expect(remapDiagnostics(merged, [d])[0]).toMatchObject({ file: 'shared/authoring/fixtures/a.toml', line: 2 })
  })

  it('keeps every hub preset visible to the flow checks', () => {
    const context = loadContext(root)
    const text = readSceneText(root, 'shared/authoring/scenes/hub.toml')
    expect(text).toContain('[[presets]]')
    expect(context.root).toBe(root)
  })
})
