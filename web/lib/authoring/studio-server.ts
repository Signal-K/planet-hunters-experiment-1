// Server side of the Scene Studio: reads scene scripts, applies edits safely and keeps compiled runtime files in step.
// Dev only. Nothing here is reachable in production (the route and page refuse outside `next dev`).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, normalize, sep } from 'node:path'
import { compileAll } from './compile.ts'
import { applyEdits } from './edit.ts'
import { readFocus, writeFocus } from './focus.ts'
import { FIXTURE_TABLES, fixturesFile, markerFor, readSceneText, remapDiagnostics, splitSceneText } from './fixtures-merge.ts'
import { withDials } from './dials.ts'
import { listScenes } from './scenes.ts'
import type { CompileSummary, DataDocBundle, DocBundle, Fixture, FlowSummary, SceneBundle, StudioIndex, StudioResponse } from './studio-types.ts'
import { AUTHORING_DIR, docKindOf, hasErrors, loadContext, loadSchema, validateDocument } from './validate.ts'
import type { AuthoringContext } from './validate.ts'
import type { EditOp } from './edit.ts'
import type { FlowDoc, MissionDoc, SceneDoc } from './docs.ts'

const SCENE_ID = /^[a-z0-9][a-z0-9-]*$/
const WRITABLE = /\.(toml|md|jpg|jpeg|png|webp)$/
const MAX_IMAGE_BYTES = 3 * 1024 * 1024

export const hashOf = (text: string): string => createHash('sha1').update(text).digest('hex').slice(0, 12)

/** A path inside shared/authoring/ and nowhere else. Throws on anything that could escape it. */
export function safeAuthoringPath(root: string, rel: string): string {
  const clean = normalize(rel).split(sep).join('/')
  if (!clean.startsWith(`${AUTHORING_DIR}/`) || clean.includes('..') || !WRITABLE.test(clean)) throw new Error(`refusing to touch ${rel}`)
  return join(root, clean)
}

function atomicWrite(abs: string, content: string | Buffer): void {
  mkdirSync(dirname(abs), { recursive: true })
  const pending = `${abs}.${process.pid}.tmp`
  writeFileSync(pending, content)
  renameSync(pending, abs)
}

export function readDoc(root: string, file: string, context: AuthoringContext): DocBundle {
  const abs = safeAuthoringPath(root, file)
  if (!existsSync(abs)) return { file, exists: false, text: '', hash: hashOf(''), value: null, diagnostics: [] }
  const text = readSceneText(root, file)
  const { doc, diagnostics } = validateDocument(text, file, context)
  return { file, exists: true, text, hash: hashOf(text), value: doc && docKindOf(file) === 'scene' ? withDials(doc.value as unknown as SceneDoc) as unknown as Record<string, unknown> : doc?.value ?? null, diagnostics: remapDiagnostics(text, diagnostics) }
}

/** Cheap change detector: a hash of every file behind a bundle. The Studio polls with it and only refetches on change. */
export function bundleSignature(root: string, files: string[]): string {
  return hashOf(files.map(f => { const abs = safeAuthoringPath(root, f); return existsSync(abs) ? readFileSync(abs, 'utf8') : '' }).join('\u0000'))
}

export const sceneFiles = (id: string): string[] => [`${AUTHORING_DIR}/scenes/${id}.toml`, `${AUTHORING_DIR}/fixtures/${id}.toml`, `${AUTHORING_DIR}/feedback/${id}.toml`, noteFile(id, 'always'), noteFile(id, 'next')]

const noteFile = (id: string, which: 'always' | 'next') => `${AUTHORING_DIR}/instructions/scenes/${id}${which === 'next' ? '.next' : ''}.md`
const readNote = (root: string, id: string, which: 'always' | 'next'): string => {
  const abs = join(root, noteFile(id, which))
  return existsSync(abs) ? readFileSync(abs, 'utf8') : ''
}

/** Native snapshot names for a scene's fixtures, from the qa entries it links to. */
function nativeSnapshots(root: string, qaIds: unknown): Record<string, string> {
  const file = join(root, 'qa/scenes.json')
  if (!existsSync(file) || !Array.isArray(qaIds)) return {}
  const registry = JSON.parse(readFileSync(file, 'utf8')) as { scenes: { id: string; web?: string | null; native?: string | null }[] }
  const out: Record<string, string> = {}
  for (const entry of registry.scenes) if (qaIds.includes(entry.id) && entry.web && entry.native) out[entry.web] = entry.native
  return out
}

export function loadSceneBundle(root: string, id: string, context: AuthoringContext, fixtures: (route: string, curated: { label: string; preset: string; note?: string }[]) => Fixture[], hostRoot?: string): SceneBundle {
  if (!SCENE_ID.test(id)) throw new Error(`"${id}" is not a scene id`)
  const scene = readDoc(root, `${AUTHORING_DIR}/scenes/${id}.toml`, context)
  if (!scene.exists) throw new Error(`no scene script for "${id}"`)
  const value = (scene.value ?? {}) as Partial<SceneDoc>
  const type = typeof value.type === 'string' ? context.sceneTypes.sceneTypes[value.type] : undefined
  return {
    id,
    scene,
    feedback: readDoc(root, `${AUTHORING_DIR}/feedback/${id}.toml`, context),
    notes: { always: readNote(root, id, 'always'), next: readNote(root, id, 'next'), alwaysFile: noteFile(id, 'always'), nextFile: noteFile(id, 'next') },
    fixtures: fixtures(String(value.preview?.route ?? id), Array.isArray(value.states) ? value.states : []),
    nativeByFixture: nativeSnapshots(root, value.qa),
    slots: context.sceneTypes.sharedSlots,
    sceneSlots: type?.slots ?? [],
    schemas: { scene: loadSchema(root, 'scene'), feedback: loadSchema(root, 'feedback') },
    hostRoot,
    sig: bundleSignature(root, sceneFiles(id)),
  }
}

export function loadDataDoc(root: string, kind: 'world' | 'mission', id: string, context: AuthoringContext): DataDocBundle {
  const dir = kind === 'world' ? 'worlds' : 'missions'
  const file = join(AUTHORING_DIR, dir, `${id}.toml`).split(sep).join('/')
  const doc = readDoc(root, file, context)
  if (!doc.exists) throw new Error(`no ${kind} named "${id}"`)
  const preview = ((doc.value as Partial<MissionDoc> | null)?.preview ?? {}) as { route?: string; state?: string }
  return { kind, id, doc, schema: loadSchema(root, kind), previewScene: kind === 'world' ? 'hub' : preview.route ?? 'missions', previewState: kind === 'world' ? 'cp-mid' : preview.state, sig: bundleSignature(root, [file]) }
}

export function loadIndex(root: string, context: AuthoringContext): StudioIndex {
  const data: StudioIndex['data'] = []
  for (const [kind, dir] of [['world', 'worlds'], ['mission', 'missions']] as const) {
    const abs = join(root, AUTHORING_DIR, dir)
    if (!existsSync(abs)) continue
    for (const name of readdirSync(abs).filter(n => n.endsWith('.toml')).sort()) {
      const file = `${AUTHORING_DIR}/${dir}/${name}`
      const { doc, diagnostics } = validateDocument(readFileSync(join(root, file), 'utf8'), file, context)
      const value = (doc?.value ?? {}) as Partial<MissionDoc>
      data.push({ kind, id: name.replace(/\.toml$/, ''), title: kind === 'mission' ? `${value.title ?? name} (${value.id ?? ''})` : name.replace(/\.toml$/, ''), file, errors: diagnostics.filter(d => d.severity === 'error').length })
    }
  }
  const mapFile = join(root, 'shared/engine/game-map.generated.json')
  const inventory: StudioIndex['inventory'] = existsSync(mapFile)
    ? (() => {
      const map = JSON.parse(readFileSync(mapFile, 'utf8')) as Omit<StudioIndex['inventory'], 'scenes'> & { scenes: { scripts: StudioIndex['inventory']['scenes'] } }
      return { counts: map.counts, gaps: map.gaps, scenes: map.scenes.scripts, mechanics: map.mechanics, journey: map.journey }
    })()
    : { counts: { webRoutes: 0, nativeScreenCases: 0, authoredSceneScripts: 0, authoredObjectNodes: 0, authoredGameObjects: 0, authoredUiElements: 0, authoredPrefabInstances: 0, mechanics: 0, sharedLayoutObjects: 0, hostLayoutObjects: 0 }, gaps: { scenesWithoutObjects: [], routesWithoutNativeCase: [], mechanicsWithoutNativeSources: [], unownedDomainFiles: [] }, scenes: [], mechanics: [] }
  return { scenes: listScenes(root, context), flows: listFlows(root, context), data, focus: readFocus(root), inventory }
}

function listFlows(root: string, context: AuthoringContext): FlowSummary[] {
  const dir = join(root, AUTHORING_DIR, 'flows')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(name => name.endsWith('.toml')).sort().flatMap(name => {
    const file = `${AUTHORING_DIR}/flows/${name}`
    const { doc, diagnostics } = validateDocument(readFileSync(join(root, file), 'utf8'), file, context)
    const value = doc?.value as Partial<FlowDoc> | undefined
    if (!value || !Array.isArray(value.steps)) return []
    const steps = value.steps.filter(step => typeof step?.scene === 'string' && typeof step?.title === 'string')
    return [{ id: name.replace(/\.toml$/, ''), name: value.name ?? name, summary: value.summary ?? '', file, steps, errors: diagnostics.filter(d => d.severity === 'error').length }]
  })
}

function compileSummary(root: string, context: AuthoringContext): CompileSummary {
  const result = compileAll({ root, write: true, presets: context.presets })
  return { ok: result.ok, written: result.files.filter(f => f.status === 'written').map(f => f.path), errors: result.diagnostics.filter(d => d.severity === 'error').length }
}

const feedbackTemplate = (scene: string) => `#:schema ../schema/feedback.schema.json\nformat = 1\nscene = "${scene}"\nmode = "fix"\nstatus = "open"\n`

function commit(root: string, file: string, before: string | null, text: string, context: AuthoringContext, expectHash?: string): StudioResponse {
  const abs = safeAuthoringPath(root, file)
  if (expectHash !== undefined && before !== null && hashOf(before) !== expectHash) {
    return { ok: false, stale: true, error: `${file} changed on disk since you opened it. Reloaded.` }
  }
  const parts = splitSceneText(text)
  atomicWrite(abs, parts.scene)
  if (parts.fixtures) atomicWrite(safeAuthoringPath(root, parts.fixtures.file), parts.fixtures.text)
  const doc = readDoc(root, file, context)
  const kind = docKindOf(file)
  return { ok: true, before: before ?? '', doc, compile: kind === 'world' || kind === 'mission' ? compileSummary(root, context) : undefined }
}

export function editDocument(root: string, file: string, ops: EditOp[], context: AuthoringContext, expectHash?: string): StudioResponse {
  const abs = safeAuthoringPath(root, file)
  let before: string | null = existsSync(abs) ? readSceneText(root, file) : null
  if (before === null) {
    const feedback = file.match(/^shared\/authoring\/feedback\/([a-z0-9-]+)\.toml$/)
    if (!feedback) return { ok: false, error: `${file} does not exist` }
    before = feedbackTemplate(feedback[1])
    atomicWrite(abs, before)
  }
  // The merged text carries the fixtures after a marker line, so an edit lands in whichever file owns that table.
  const fixtures = fixturesFile(file)
  const hasFixtures = !!fixtures && splitSceneText(before).fixtures !== null
  const mine = (op: EditOp) => hasFixtures && FIXTURE_TABLES.has(String(op.path[0]))
  const parts = splitSceneText(before)
  const sceneEdit = applyEdits(parts.scene, ops.filter(op => !mine(op)))
  if (!sceneEdit.ok) return { ok: false, error: sceneEdit.error }
  let merged = sceneEdit.text
  if (parts.fixtures) {
    const fixtureEdit = applyEdits(parts.fixtures.text, ops.filter(mine))
    if (!fixtureEdit.ok) return { ok: false, error: fixtureEdit.error }
    merged = readSceneTextFrom(sceneEdit.text, parts.fixtures.file, fixtureEdit.text)
  }
  return commit(root, file, before, merged, context, expectHash)
}

const readSceneTextFrom = (scene: string, fixtures: string, fixtureText: string): string =>
  `${scene.endsWith('\n') ? scene : `${scene}\n`}\n${markerFor(fixtures)}${fixtureText}`

export function writeDocument(root: string, file: string, text: string, context: AuthoringContext, expectHash?: string): StudioResponse {
  const abs = safeAuthoringPath(root, file)
  const before = existsSync(abs) ? readSceneText(root, file) : null
  if (file.endsWith('.toml')) {
    const check = validateDocument(text, file, context)
    if (check.diagnostics.some(d => d.code === 'syntax')) return { ok: false, error: `that text is not valid TOML (line ${check.diagnostics[0].line})` }
  }
  return commit(root, file, before, text, context, expectHash)
}

export function writeNote(root: string, scene: string, which: 'always' | 'next', text: string): StudioResponse {
  if (!SCENE_ID.test(scene)) return { ok: false, error: `"${scene}" is not a scene id` }
  const file = noteFile(scene, which)
  atomicWrite(safeAuthoringPath(root, file), text.endsWith('\n') || text === '' ? text : `${text}\n`)
  return { ok: true }
}

/** Moves the next-pass brief into the persistent notes once it has become a standing rule. */
export function promoteNote(root: string, scene: string): StudioResponse {
  if (!SCENE_ID.test(scene)) return { ok: false, error: `"${scene}" is not a scene id` }
  const next = readNote(root, scene, 'next').trim()
  if (!next) return { ok: false, error: 'the next-pass brief is empty' }
  const always = readNote(root, scene, 'always').trimEnd()
  writeNote(root, scene, 'always', `${always ? `${always}\n\n` : ''}${next}`)
  writeNote(root, scene, 'next', '')
  return { ok: true }
}

const IMAGE_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

/** Saves a pasted or dropped reference screenshot and returns its file name. */
export function saveReference(root: string, scene: string, dataUrl: string): StudioResponse {
  if (!SCENE_ID.test(scene)) return { ok: false, error: `"${scene}" is not a scene id` }
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) return { ok: false, error: 'that is not a png, jpeg or webp image' }
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: 'the image is over 3 MB; paste a smaller one' }
  const dir = join(root, AUTHORING_DIR, 'feedback/refs')
  let n = 1
  while (existsSync(join(dir, `${scene}-${n}.${IMAGE_TYPES[match[1]]}`))) n++
  const name = `${scene}-${n}.${IMAGE_TYPES[match[1]]}`
  atomicWrite(safeAuthoringPath(root, `${AUTHORING_DIR}/feedback/refs/${name}`), bytes)
  return { ok: true, ref: name }
}

export function setFocus(root: string, scenes: string[], ticket?: string): StudioResponse {
  writeFocus(root, { scenes: scenes.filter(s => SCENE_ID.test(s)), ticket })
  return { ok: true }
}

export { hasErrors, loadContext }
