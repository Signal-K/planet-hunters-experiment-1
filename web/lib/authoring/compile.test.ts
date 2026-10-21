import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compileAll } from './compile.ts'
import { parseToml } from './toml.ts'
import { applyEdit } from './edit.ts'

const REPO = join(process.cwd(), '..')

describe('the real authoring sources', () => {
  it('validate cleanly and every compiled runtime file is current', () => {
    const result = compileAll({ root: REPO, write: false })
    const problems = result.diagnostics.filter(d => d.severity === 'error').map(d => `${d.file}:${d.line} ${d.message}`)
    expect(problems).toEqual([])
    const stale = result.files.filter(f => f.status === 'stale').map(f => f.path)
    expect(stale, 'run `npm run authoring:compile` to refresh these').toEqual([])
    expect(result.files.length).toBeGreaterThan(0)
  })

  it('compile the base world to exactly the data the runtime had before TOML', () => {
    const toml = parseToml(readFileSync(join(REPO, 'shared/authoring/worlds/base-world.toml'), 'utf8'))
    if (!toml.ok) throw new Error(toml.error.message)
    const { format, ...runtime } = toml.doc.value
    expect(format).toBe(1)
    const compiled = JSON.parse(readFileSync(join(REPO, 'shared/scenes/base-world.json'), 'utf8'))
    expect(compiled).toEqual(runtime)
    expect(JSON.stringify(compiled)).toBe(JSON.stringify(runtime))
  })
})

describe('compileAll in a scratch repo', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'authoring-'))
    mkdirSync(join(root, 'shared/engine'), { recursive: true })
    cpSync(join(REPO, 'shared/engine/scene-types.json'), join(root, 'shared/engine/scene-types.json'))
    cpSync(join(REPO, 'shared/authoring/schema'), join(root, 'shared/authoring/schema'), { recursive: true })
    mkdirSync(join(root, 'shared/authoring/missions'), { recursive: true })
    mkdirSync(join(root, 'web/lib'), { recursive: true })
    writeFileSync(join(root, 'web/lib/devPresets.ts'), "case 'cp-mid':\ncase 'transport-hub':\n")
    for (const name of ['client-contract', 'free-mining']) cpSync(join(REPO, `shared/authoring/missions/${name}.toml`), join(root, `shared/authoring/missions/${name}.toml`))
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('writes the mission declarations for web and native, then reports them current', () => {
    const first = compileAll({ root, write: true })
    expect(first.ok).toBe(true)
    expect(first.files.map(f => f.status)).toEqual(['written', 'written', 'written'])
    const declared = JSON.parse(readFileSync(join(root, 'shared/missions/authored-missions.json'), 'utf8'))
    expect(declared.missions.map((m: { id: string }) => m.id)).toEqual(['lnm_m3_relay_bennu_vesta', 'freeops-self-directed-mining'])
    expect(declared.missions[0].payout).toEqual({ floor_sequence: 3, affinity: 3 })
    expect(declared.missions[0].preview).toBeUndefined()
    const swift = readFileSync(join(root, 'native/LandnamCore/Sources/LandnamCore/Data/AuthoredMissions.generated.swift'), 'utf8')
    expect(swift).toContain('static let json = #"""')
    expect(swift).toContain('"id": "lnm_m3_relay_bennu_vesta"')
    expect(compileAll({ root, write: false }).files.every(f => f.status === 'current')).toBe(true)
  })

  it('detects a source edit as drift until it is compiled', () => {
    compileAll({ root, write: true })
    const file = join(root, 'shared/authoring/missions/free-mining.toml')
    const edited = applyEdit(readFileSync(file, 'utf8'), { op: 'set', path: ['requires', 'cargo_min'], value: 2 })
    if (!edited.ok) throw new Error(edited.error)
    writeFileSync(file, edited.text)
    const check = compileAll({ root, write: false })
    expect(check.ok).toBe(false)
    expect(check.files.filter(f => f.status === 'stale')).toHaveLength(3)
    const fixed = compileAll({ root, write: true })
    expect(fixed.ok).toBe(true)
    expect(JSON.parse(readFileSync(join(root, 'shared/missions/authored-missions.json'), 'utf8')).missions[1].requires.cargo_min).toBe(2)
  })

  it('writes nothing for a source with errors and names the line', () => {
    compileAll({ root, write: true })
    const before = readFileSync(join(root, 'shared/missions/authored-missions.json'), 'utf8')
    const file = join(root, 'shared/authoring/missions/free-mining.toml')
    writeFileSync(file, readFileSync(file, 'utf8').replace('cargo_min = 1', 'cargo_min = "lots"'))
    const result = compileAll({ root, write: true })
    expect(result.ok).toBe(false)
    const error = result.diagnostics.find(d => d.severity === 'error')!
    expect(error).toMatchObject({ file: 'shared/authoring/missions/free-mining.toml', message: 'expected a whole number, found a string' })
    expect(error.line).toBeGreaterThan(1)
    expect(readFileSync(join(root, 'shared/missions/authored-missions.json'), 'utf8')).toBe(before)
  })

  it('rejects a duplicate mission id across files', () => {
    const file = join(root, 'shared/authoring/missions/free-mining.toml')
    writeFileSync(file, readFileSync(file, 'utf8').replace('freeops-self-directed-mining', 'lnm_m3_relay_bennu_vesta'))
    const result = compileAll({ root, write: false })
    expect(result.diagnostics.some(d => d.code === 'duplicate-id' && d.message.includes('already defined'))).toBe(true)
  })

  it('validates an unsaved edit through the overlay without touching disk', () => {
    const path = 'shared/authoring/missions/free-mining.toml'
    const overlay = { [path]: readFileSync(join(root, path), 'utf8').replace('floor_sequence', 'floor_seq') }
    expect(compileAll({ root, write: false, overlay }).diagnostics.filter(d => d.file === path && d.severity === 'error')).toEqual([])
    const bad = { [path]: readFileSync(join(root, path), 'utf8').replace('difficulty = "L2"', 'difficulty = 7') }
    expect(compileAll({ root, write: false, overlay: bad }).diagnostics.some(d => d.message.startsWith('expected a string'))).toBe(true)
  })
})
