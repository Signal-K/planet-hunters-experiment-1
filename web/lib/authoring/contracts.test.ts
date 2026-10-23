import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compileAll } from './compile'
import { loadContext, validateDocument } from './validate'

const root = join(process.cwd(), '..')
const path = 'shared/authoring/scenes/launchpad.toml'
const source = readFileSync(join(root, path), 'utf8')
const context = loadContext(root)

describe('engine authoring contract', () => {
  it.each([
    ['mechanic', source.replace('mechanics = ["world"]', 'mechanics = ["missing-mechanic"]')],
    ['component', source.replace('"BaseWorldSimulation"', '"MissingComponent"')],
    ['parent', source.replace('parent = "launchpad-complex"', 'parent = "missing-parent"')],
    ['action-adapter', source.replace('route = "launchpad"', 'route = "hub"')],
    ['parent-space', source.replace('parent = "launchpad-complex"', '')],
    ['shared-geometry', source.replace('w = 0.1904', 'w = 0')],
  ])('rejects invalid %s links with a source location', (code, text) => {
    const result = validateDocument(text, path, context)
    expect(result.diagnostics.some(item => item.code === code && item.line > 1)).toBe(true)
  })

  it('never produces partial web/native outputs when any document fails', () => {
    const result = compileAll({ root, write: false, overlay: { [path]: source.replace('"BaseWorldSimulation"', '"MissingComponent"') } })
    expect(result.ok).toBe(false)
    expect(result.files).toEqual([])
  })

  it('declares every system owner and reports real route gaps, not first-case-per-line counts', () => {
    const map = JSON.parse(readFileSync(join(root, 'shared/engine/game-map.generated.json'), 'utf8'))
    expect(map.counts.nativeScreenCases).toBe(26)
    expect(map.gaps.routesWithoutNativeCase).toEqual(['refinery'])
    expect(map.gaps.scenesWithoutMechanics).toEqual([])
    expect(map.gaps.unownedDomainFiles).toEqual([])
    expect(map.counts.sharedLayoutObjects).toBe(4)
    expect(map.counts.hostLayoutObjects).toBeGreaterThan(0)
    expect(context.contractDiagnostics).toEqual([])
  })
})
