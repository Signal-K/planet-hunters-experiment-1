import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { editDocument, hashOf, loadIndex, loadSceneBundle, promoteNote, readDoc, safeAuthoringPath, saveReference, setFocus, writeDocument, writeNote } from './studio-server.ts'
import { loadContext } from './validate.ts'
import { readFocus } from './focus.ts'
import { resolveFocusScenes } from './studio-model.ts'
import type { FeedbackDoc, SceneDoc } from './docs.ts'

const REPO = join(process.cwd(), '..')
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

let root: string
const context = () => loadContext(root, new Set(['m1-hub', 'cp-mid', 'transport-hub']))
const fixtures = () => []

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'studio-'))
  mkdirSync(join(root, 'shared/engine'), { recursive: true })
  cpSync(join(REPO, 'shared/engine/scene-types.json'), join(root, 'shared/engine/scene-types.json'))
  cpSync(join(REPO, 'shared/authoring/schema'), join(root, 'shared/authoring/schema'), { recursive: true })
  for (const dir of ['missions', 'worlds']) cpSync(join(REPO, 'shared/authoring', dir), join(root, 'shared/authoring', dir), { recursive: true })
  mkdirSync(join(root, 'shared/authoring/scenes'), { recursive: true })
  mkdirSync(join(root, 'web/lib'), { recursive: true })
  mkdirSync(join(root, 'web/public/game/assets'), { recursive: true })
  cpSync(join(REPO, 'web/public/game/assets/base'), join(root, 'web/public/game/assets/base'), { recursive: true })
  writeFileSync(join(root, 'web/lib/devPresets.ts'), "case 'm1-hub':\ncase 'cp-mid':\ncase 'transport-hub':\n")
  writeFileSync(
    join(root, 'shared/authoring/scenes/missions.toml'),
    'format = 1\nid = "missions"\ntype = "menu"\nname = "Mission Board"\n\n[runtime]\nsurface = "dom"\n\n[preview]\nroute = "missions"\nstate = "cp-mid"\n\n[[objects]]\nid = "board"\nkind = "panel"\nrect = { x = 0.1, y = 0.2, w = 0.5, h = 0.4 }\n',
  )
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('safeAuthoringPath', () => {
  it('only allows writable files under shared/authoring', () => {
    expect(safeAuthoringPath(root, 'shared/authoring/scenes/hub.toml')).toBe(join(root, 'shared/authoring/scenes/hub.toml'))
    for (const bad of ['../etc/passwd', 'shared/authoring/../../x.toml', 'web/package.json', 'shared/authoring/scenes/hub.sh', '/etc/passwd', 'shared/authoring/scenes/../../../x.md']) {
      expect(() => safeAuthoringPath(root, bad), bad).toThrow('refusing')
    }
  })
})

describe('editDocument', () => {
  const file = 'shared/authoring/scenes/missions.toml'

  it('moves an object by editing only its rect and returns the previous text for undo', () => {
    const before = readFileSync(join(root, file), 'utf8')
    const response = editDocument(root, file, [{ op: 'set', path: ['objects', 0, 'rect'], value: { x: 0.2, y: 0.25, w: 0.5, h: 0.4 } }], context(), hashOf(before))
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.before).toBe(before)
    expect((response.doc?.value as unknown as SceneDoc).objects?.[0].rect).toEqual({ x: 0.2, y: 0.25, w: 0.5, h: 0.4 })
    expect(response.doc?.diagnostics.filter(d => d.severity === 'error')).toEqual([])
    expect(response.doc?.text.replace('x = 0.2, y = 0.25', 'x = 0.1, y = 0.2')).toBe(before)
  })

  it('refuses to overwrite a file that changed since the caller read it', () => {
    const stale = hashOf('older text')
    const response = editDocument(root, file, [{ op: 'set', path: ['name'], value: 'x' }], context(), stale)
    expect(response).toMatchObject({ ok: false, stale: true })
    expect(readFileSync(join(root, file), 'utf8')).toContain('name = "Mission Board"')
  })

  it('reports an edit that cannot apply without touching the file', () => {
    const before = readFileSync(join(root, file), 'utf8')
    expect(editDocument(root, file, [{ op: 'remove', path: ['objects', 9] }], context())).toMatchObject({ ok: false })
    expect(readFileSync(join(root, file), 'utf8')).toBe(before)
  })

  it('saves a drawn proposal and flags a mistake in it with its line', () => {
    const response = editDocument(root, file, [{ op: 'append', path: ['objects'], value: { id: 'help-button', kind: 'button', rect: { x: 0.9, y: 0.9, w: 0.3, h: 0.1 }, status: 'proposed', note: 'A help button' } }], context())
    if (!response.ok || !response.doc) throw new Error('edit failed')
    const problem = response.doc.diagnostics.find(d => d.code === 'rect-bounds')!
    expect(problem.message).toContain('right edge')
    expect(response.doc.text.split('\n')[problem.line - 1]).toContain('rect = { x = 0.9')
  })

  it('creates the feedback file on the first pin, then keeps adding', () => {
    const feedback = 'shared/authoring/feedback/missions.toml'
    expect(existsSync(join(root, feedback))).toBe(false)
    const first = editDocument(root, feedback, [{ op: 'append', path: ['pins'], value: { kind: 'wrong', note: 'Tabs read as green', at: { x: 0.5, y: 0.1 }, viewport: 'ph', state: 'cp-mid' } }], context())
    if (!first.ok || !first.doc) throw new Error('first pin failed')
    expect(first.doc.value).toMatchObject({ scene: 'missions', mode: 'fix', status: 'open', pins: [{ kind: 'wrong', note: 'Tabs read as green' }] })
    const second = editDocument(root, feedback, [{ op: 'append', path: ['pins'], value: { kind: 'keep', note: 'The board layout works' } }], context(), first.doc.hash)
    expect(second.ok && (second.doc?.value as unknown as FeedbackDoc).pins).toHaveLength(2)
    expect(second.ok && second.doc?.diagnostics.filter(d => d.severity === 'error')).toEqual([])
  })

  it('recompiles the runtime files when a mission is edited', () => {
    const file = 'shared/authoring/missions/free-mining.toml'
    const response = editDocument(root, file, [{ op: 'set', path: ['requires', 'cargo_min'], value: 4 }], context())
    if (!response.ok) throw new Error(response.error)
    expect(response.compile).toMatchObject({ ok: true })
    expect(response.compile?.written.length).toBeGreaterThan(0)
    expect(JSON.parse(readFileSync(join(root, 'shared/missions/authored-missions.json'), 'utf8')).missions[1].requires.cargo_min).toBe(4)
  })
})

describe('writeDocument', () => {
  it('restores earlier text for undo and refuses text that is not TOML', () => {
    const file = 'shared/authoring/scenes/missions.toml'
    const original = readFileSync(join(root, file), 'utf8')
    const edited = editDocument(root, file, [{ op: 'set', path: ['name'], value: 'Changed' }], context())
    if (!edited.ok) throw new Error('edit')
    expect(writeDocument(root, file, 'name = = oops', context())).toMatchObject({ ok: false })
    const undone = writeDocument(root, file, edited.before!, context(), edited.doc!.hash)
    expect(undone.ok).toBe(true)
    expect(readFileSync(join(root, file), 'utf8')).toBe(original)
  })
})

describe('notes, references and focus', () => {
  it('writes persistent and next-pass notes and promotes the brief', () => {
    writeNote(root, 'missions', 'always', 'Cards are fine here.')
    writeNote(root, 'missions', 'next', 'Make tabs blue, not green')
    expect(promoteNote(root, 'missions')).toEqual({ ok: true })
    const bundle = loadSceneBundle(root, 'missions', context(), fixtures)
    expect(bundle.notes.always).toBe('Cards are fine here.\n\nMake tabs blue, not green\n')
    expect(bundle.notes.next).toBe('')
    expect(promoteNote(root, 'missions')).toMatchObject({ ok: false })
    expect(writeNote(root, '../evil', 'always', 'x')).toMatchObject({ ok: false })
  })

  it('stores pasted screenshots with a running number and rejects other data', () => {
    const one = saveReference(root, 'missions', PNG)
    const two = saveReference(root, 'missions', PNG)
    expect(one).toEqual({ ok: true, ref: 'missions-1.png' })
    expect(two).toEqual({ ok: true, ref: 'missions-2.png' })
    expect(existsSync(join(root, 'shared/authoring/feedback/refs/missions-2.png'))).toBe(true)
    expect(saveReference(root, 'missions', 'data:text/html;base64,PGI+')).toMatchObject({ ok: false })
    expect(saveReference(root, 'missions', `data:image/png;base64,${'A'.repeat(5_000_000)}`)).toMatchObject({ ok: false })
  })

  it('records the working focus for every agent to read', () => {
    setFocus(root, ['hub', 'not valid!', 'hangar'], 'SSL-641')
    expect(readFocus(root)).toMatchObject({ scenes: ['hub', 'hangar'], ticket: 'SSL-641', note: '', title: '' })
    expect(existsSync(join(root, 'web/.storyboard/focus.json'))).toBe(true)
  })

  it('lists scenes with their feedback state in the index', () => {
    editDocument(root, 'shared/authoring/feedback/missions.toml', [{ op: 'append', path: ['pins'], value: { kind: 'wrong', note: 'x' } }], context())
    const index = loadIndex(root, context())
    expect(resolveFocusScenes(index.scenes, ['missions', 'unknown'])).toEqual(['missions'])
    expect(index.scenes.find(s => s.id === 'missions')).toMatchObject({ errors: 0, objects: 1, feedback: { exists: true, wrong: 1, unresolved: 1 } })
    expect(index.data.map(d => d.id)).toEqual(['base-world', 'client-contract', 'free-mining'])
    expect(readDoc(root, 'shared/authoring/scenes/missions.toml', context()).exists).toBe(true)
  })
})
