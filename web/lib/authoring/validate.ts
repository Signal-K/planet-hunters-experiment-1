// Validation for every authoring document. Problems carry a file, line and column so the Studio, the CLI and the editor
// can all point at the exact bytes. Schema checks come from shared/authoring/schema/; cross-reference rules live here
// and only run once a document has passed its schema, so they can rely on the shapes in docs.ts.
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { validateSchema } from './schema.ts'
import type { Schema } from './schema.ts'
import { parseToml, spanForPath } from './toml.ts'
import type { ParsedToml, Path } from './toml.ts'
import type { FeedbackDoc, MissionDoc, SceneDoc, SceneObject, WorldDoc, WorldEntity } from './docs.ts'

export type DocKind = 'world' | 'scene' | 'mission' | 'feedback'

export interface Diagnostic {
  file: string
  severity: 'error' | 'warning'
  code: string
  message: string
  line: number
  column: number
  endLine: number
  endColumn: number
  path?: Path
}

export interface SceneTypesFile {
  sharedSlots: Record<string, { x: number; y: number; w: number; h: number; layer: string }>
  sceneTypes: Record<string, { description: string; slots: string[]; routes: string[] }>
}

export interface AuthoringContext {
  root: string
  sceneTypes: SceneTypesFile
  /** Stage fixture keys. Left out, preset references are not checked. */
  presets?: ReadonlySet<string>
}

export const AUTHORING_DIR = 'shared/authoring'

export function docKindOf(relPath: string): DocKind | null {
  const match = relPath.replaceAll('\\', '/').match(/^shared\/authoring\/(worlds|scenes|missions|feedback)\/[^/]+\.toml$/)
  if (!match) return null
  return ({ worlds: 'world', scenes: 'scene', missions: 'mission', feedback: 'feedback' } as const)[match[1] as 'worlds' | 'scenes' | 'missions' | 'feedback']
}

const schemaCache = new Map<string, Schema>()
export function loadSchema(root: string, kind: DocKind): Schema {
  const file = join(root, AUTHORING_DIR, 'schema', `${kind}.schema.json`)
  const cached = schemaCache.get(file)
  if (cached) return cached
  const schema = JSON.parse(readFileSync(file, 'utf8')) as Schema
  schemaCache.set(file, schema)
  return schema
}

export function loadContext(root: string, presets?: ReadonlySet<string>): AuthoringContext {
  const sceneTypes = JSON.parse(readFileSync(join(root, 'shared/engine/scene-types.json'), 'utf8')) as SceneTypesFile
  return { root, sceneTypes, presets }
}

/** Every stage fixture key, read from the source of web/lib/devPresets.ts (plain Node cannot import that file). */
export function scrapePresetKeys(root: string): Set<string> {
  const source = readFileSync(join(root, 'web/lib/devPresets.ts'), 'utf8')
  return new Set([...source.matchAll(/^\s*case '([^']+)':/gm)].map(m => m[1]))
}

export interface ValidationResult {
  doc?: ParsedToml
  diagnostics: Diagnostic[]
}

type Report = (path: Path, code: string, message: string, severity?: 'error' | 'warning') => void
type Rule<T> = (scope: { value: T; relPath: string; context: AuthoringContext; report: Report }) => void

const fileExists = (context: AuthoringContext, rel: string) => existsSync(join(context.root, rel))

function qaSceneIds(context: AuthoringContext): Set<string> | null {
  const file = join(context.root, 'qa/scenes.json')
  if (!existsSync(file)) return null
  const registry = JSON.parse(readFileSync(file, 'utf8')) as { scenes: { id: string }[] }
  return new Set(registry.scenes.map(s => s.id))
}
const EPS = 0.001

const sceneRules: Rule<SceneDoc> = ({ value, relPath, context, report }) => {
  const stem = basename(relPath, '.toml')
  if (value.id !== stem) report(['id'], 'id-file', `id "${value.id}" must match the file name "${stem}"`)

  const type = context.sceneTypes.sceneTypes[value.type]
  if (!type) {
    report(['type'], 'scene-type', `unknown scene type "${value.type}" (known: ${Object.keys(context.sceneTypes.sceneTypes).join(', ')})`)
    return
  }
  if (!type.routes.includes(value.preview.route)) {
    report(['preview', 'route'], 'route', `"${value.preview.route}" is not a ${value.type} route (${type.routes.join(', ')}). Routes are listed in shared/engine/scene-types.json`)
  }
  if (value.preview.state !== undefined && context.presets && !context.presets.has(value.preview.state)) {
    report(['preview', 'state'], 'preset', `"${value.preview.state}" is not a stage fixture (see web/lib/devPresets.ts)`)
  }
  for (const group of ['web', 'native', 'engine'] as const) {
    value.runtime[group]?.forEach((file, i) => {
      if (!fileExists(context, file)) report(['runtime', group, i], 'file-missing', `${file} does not exist`)
    })
  }
  value.runtime.data?.forEach((file, i) => {
    if (!fileExists(context, `${AUTHORING_DIR}/${file}`)) report(['runtime', 'data', i], 'file-missing', `${AUTHORING_DIR}/${file} does not exist`)
  })

  if (value.qa?.length) {
    const known = qaSceneIds(context)
    value.qa.forEach((id, i) => {
      if (known && !known.has(id)) report(['qa', i], 'qa-id', `"${id}" is not a scene in qa/scenes.json`)
    })
  }

  const stateIds = new Set<string>()
  value.states?.forEach((state, i) => {
    if (context.presets && !context.presets.has(state.preset)) report(['states', i, 'preset'], 'preset', `"${state.preset}" is not a stage fixture`)
    if (stateIds.has(state.id)) report(['states', i, 'id'], 'duplicate-id', `state id "${state.id}" is used twice`)
    stateIds.add(state.id)
  })

  const objects = value.objects ?? []
  const index = new Map<string, number>()
  objects.forEach((object, i) => {
    if (index.has(object.id)) report(['objects', i, 'id'], 'duplicate-id', `object id "${object.id}" is already used by object ${index.get(object.id)! + 1}`)
    else index.set(object.id, i)
  })
  objects.forEach((object, i) => {
    if (object.parent !== undefined) {
      if (!index.has(object.parent)) report(['objects', i, 'parent'], 'parent', `parent "${object.parent}" is not an object in this scene`)
      else if (isOwnAncestor(object, objects, index)) report(['objects', i, 'parent'], 'parent-cycle', `"${object.id}" is its own ancestor`)
    }
    if (object.slot !== undefined && !type.slots.includes(object.slot)) {
      report(['objects', i, 'slot'], 'slot', `a ${value.type} scene has no "${object.slot}" slot (slots: ${type.slots.join(', ')})`)
    }
    const { rect } = object
    if (rect && rect.x + rect.w > 1 + EPS) report(['objects', i, 'rect'], 'rect-bounds', 'extends past the right edge of the scene')
    if (rect && rect.y + rect.h > 1 + EPS) report(['objects', i, 'rect'], 'rect-bounds', 'extends past the bottom edge of the scene')
    const slot = object.slot ? context.sceneTypes.sharedSlots[object.slot] : undefined
    if (rect && slot && object.slot !== 'world' && (rect.x < slot.x - EPS || rect.y < slot.y - EPS || rect.x + rect.w > slot.x + slot.w + EPS || rect.y + rect.h > slot.y + slot.h + EPS)) {
      report(['objects', i, 'rect'], 'outside-slot', `lies outside its "${object.slot}" slot`, 'warning')
    }
    if (object.asset !== undefined && object.status !== 'proposed' && !fileExists(context, object.asset)) {
      report(['objects', i, 'asset'], 'file-missing', `${object.asset} does not exist`)
    }
  })
}

function isOwnAncestor(start: SceneObject, objects: SceneObject[], index: Map<string, number>): boolean {
  const seen = new Set<string>([start.id])
  let cursor = start
  while (cursor.parent !== undefined) {
    if (seen.has(cursor.parent)) return true
    seen.add(cursor.parent)
    cursor = objects[index.get(cursor.parent) ?? -1]
    if (!cursor) return false
  }
  return false
}

const missionRules: Rule<MissionDoc> = ({ value, report }) => {
  if (value.payout.francs !== undefined && value.payout.floor_sequence !== undefined) report(['payout'], 'payout-form', 'give only one of francs or floor_sequence')
  if (value.delivery_target !== undefined && value.target === undefined) report(['delivery_target'], 'delivery-target', 'a delivery leg needs a target to mine at first')
}

const worldRules: Rule<WorldDoc> = ({ value, context, report }) => {
  const sprites = new Set(Object.keys(value.sprites))
  const prefabs = new Set(Object.keys(value.prefabs))
  const checkEntity = (entity: WorldEntity, path: Path) => {
    if (entity.sprite !== undefined && !sprites.has(entity.sprite)) report([...path, 'sprite'], 'sprite', `no sprite named "${entity.sprite}" in [sprites]`)
    if (entity.emit !== undefined && !prefabs.has(entity.emit.prefab)) report([...path, 'emit', 'prefab'], 'prefab', `no prefab named "${entity.emit.prefab}" in [prefabs]`)
  }
  const lists: [Path, WorldEntity[]][] = [[['entities'], value.entities], ...Object.entries(value.biomes).map(([name, list]): [Path, WorldEntity[]] => [['biomes', name], list])]
  for (const [path, list] of lists) {
    const seen = new Set<string>()
    list.forEach((entity, i) => {
      if (entity.id !== undefined) {
        if (seen.has(entity.id)) report([...path, i, 'id'], 'duplicate-id', `entity id "${entity.id}" is used twice in this list`)
        seen.add(entity.id)
      }
      checkEntity(entity, [...path, i])
    })
  }
  for (const [name, prefab] of Object.entries(value.prefabs)) checkEntity(prefab, ['prefabs', name])
  for (const [name, sprite] of Object.entries(value.sprites)) {
    if (!fileExists(context, `web/public/game/assets/${sprite.src}`)) report(['sprites', name, 'src'], 'file-missing', `web/public/game/assets/${sprite.src} does not exist`)
  }
}

const feedbackRules: Rule<FeedbackDoc> = ({ value, relPath, context, report }) => {
  const stem = basename(relPath, '.toml')
  if (value.scene !== stem) report(['scene'], 'id-file', `scene "${value.scene}" must match the file name "${stem}"`)
  value.inspiration?.forEach((item, i) => {
    if (item.image !== undefined && !fileExists(context, `${AUTHORING_DIR}/feedback/refs/${item.image.replace(/^.*\//, '')}`)) {
      report(['inspiration', i, 'image'], 'file-missing', `${item.image} does not exist in feedback/refs/`)
    }
  })
}

export function validateDocument(text: string, relPath: string, context: AuthoringContext): ValidationResult {
  const kind = docKindOf(relPath)
  const file = relPath.replaceAll('\\', '/')
  const parsed = parseToml(text)
  if (!parsed.ok) {
    const { line, column, message } = parsed.error
    return { diagnostics: [{ file, severity: 'error', code: 'syntax', message, line, column, endLine: line, endColumn: column + 1 }] }
  }
  const { doc } = parsed
  const diagnostics: Diagnostic[] = []
  const report: Report = (path, code, message, severity = 'error') => {
    const span = spanForPath(doc, path)
    diagnostics.push({ file, severity, code, message, line: span.line, column: span.column, endLine: span.endLine, endColumn: span.endColumn, path })
  }
  if (!kind) {
    report([], 'location', `${file} is not in worlds/, scenes/, missions/ or feedback/ under ${AUTHORING_DIR}/`)
    return { doc, diagnostics }
  }
  const issues = validateSchema(doc.value, loadSchema(context.root, kind))
  for (const issue of issues) report(issue.path, issue.code, issue.message)
  if (!issues.length) {
    const scope = { relPath: file, context, report }
    // The schema has passed, so the document has exactly the shape docs.ts describes.
    if (kind === 'scene') sceneRules({ ...scope, value: doc.value as unknown as SceneDoc })
    else if (kind === 'mission') missionRules({ ...scope, value: doc.value as unknown as MissionDoc })
    else if (kind === 'world') worldRules({ ...scope, value: doc.value as unknown as WorldDoc })
    else feedbackRules({ ...scope, value: doc.value as unknown as FeedbackDoc })
  }
  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column)
  return { doc, diagnostics }
}

export const hasErrors = (diagnostics: Diagnostic[]): boolean => diagnostics.some(d => d.severity === 'error')

export const formatDiagnostic = (d: Diagnostic): string => `${d.file}:${d.line}:${d.column} ${d.severity} ${d.message} [${d.code}]`
