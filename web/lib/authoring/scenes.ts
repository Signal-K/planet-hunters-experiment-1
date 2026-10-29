// The index of scene scripts: what scenes exist, which files and tickets belong to each, and what feedback is open.
import { readSceneText } from './fixtures-merge.ts'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { AUTHORING_DIR, loadContext, validateDocument } from './validate.ts'
import type { AuthoringContext } from './validate.ts'
import { parseToml } from './toml.ts'
import type { FeedbackDoc, SceneDoc } from './docs.ts'

export interface FeedbackSummary {
  exists: boolean
  status?: 'open' | 'addressed'
  mode?: 'fix' | 'explore'
  wrong: number
  keep: number
  unresolved: number
  inspiration: number
}

export interface SceneSummary {
  id: string
  type: string
  name: string
  surface: string
  summary: string
  tickets: string[]
  qa: string[]
  web: string[]
  native: string[]
  engine: string[]
  data: string[]
  route: string
  previewState?: string
  objects: number
  proposed: number
  errors: number
  warnings: number
  feedback: FeedbackSummary
}

const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [])

export function feedbackSummary(root: string, sceneId: string): FeedbackSummary {
  const file = join(root, AUTHORING_DIR, 'feedback', `${sceneId}.toml`)
  const none: FeedbackSummary = { exists: false, wrong: 0, keep: 0, unresolved: 0, inspiration: 0 }
  if (!existsSync(file)) return none
  const parsed = parseToml(readFileSync(file, 'utf8'))
  if (!parsed.ok) return { ...none, exists: true }
  // Feedback may be mid-edit and not schema-valid, so read it leniently.
  const value = parsed.doc.value as Partial<FeedbackDoc>
  const pins = Array.isArray(value.pins) ? value.pins : []
  return {
    exists: true,
    status: value.status,
    mode: value.mode,
    wrong: pins.filter(p => p.kind === 'wrong').length,
    keep: pins.filter(p => p.kind === 'keep').length,
    unresolved: pins.filter(p => p.kind === 'wrong' && !p.resolved).length,
    inspiration: Array.isArray(value.inspiration) ? value.inspiration.length : 0,
  }
}

export function listScenes(root: string, context: AuthoringContext = loadContext(root)): SceneSummary[] {
  const dir = join(root, AUTHORING_DIR, 'scenes')
  if (!existsSync(dir)) return []
  const scenes: SceneSummary[] = []
  for (const name of readdirSync(dir).filter(n => n.endsWith('.toml')).sort()) {
    const relPath = `${AUTHORING_DIR}/scenes/${name}`
    const text = readSceneText(root, relPath)
    const { doc, diagnostics } = validateDocument(text, relPath, context)
    const v = (doc?.value ?? {}) as Partial<SceneDoc>
    const id = typeof v.id === 'string' ? v.id : name.replace(/\.toml$/, '')
    const objects = Array.isArray(v.objects) ? v.objects : []
    scenes.push({
      id,
      type: String(v.type ?? ''),
      name: String(v.name ?? id),
      surface: String(v.runtime?.surface ?? 'dom'),
      summary: String(v.summary ?? ''),
      tickets: list(v.tickets),
      qa: list(v.qa),
      web: list(v.runtime?.web),
      native: list(v.runtime?.native),
      engine: list(v.runtime?.engine),
      data: list(v.runtime?.data),
      route: String(v.preview?.route ?? id),
      previewState: typeof v.preview?.state === 'string' ? v.preview.state : undefined,
      objects: objects.length,
      proposed: objects.filter(o => o.status === 'proposed').length,
      errors: diagnostics.filter(d => d.severity === 'error').length,
      warnings: diagnostics.filter(d => d.severity === 'warning').length,
      feedback: feedbackSummary(root, id),
    })
  }
  return scenes
}

/** Repo-relative path with a leading ./ or the repo root removed. */
export function toRepoPath(root: string, input: string): string {
  const normalised = input.replaceAll('\\', '/')
  const base = root.replaceAll('\\', '/').replace(/\/$/, '')
  return normalised.startsWith(`${base}/`) ? normalised.slice(base.length + 1) : normalised.replace(/^\.\//, '')
}

/** Scenes a file belongs to: a listed runtime file or folder, its CSS module or test, or a scene's own authoring files. */
export function scenesForFile(scenes: SceneSummary[], file: string): string[] {
  const authoring = file.match(/^shared\/authoring\/(?:scenes|feedback)\/([a-z0-9-]+)\.toml$/) ?? file.match(/^shared\/authoring\/instructions\/scenes\/([a-z0-9-]+)(?:\.next)?\.md$/)
  if (authoring) return scenes.some(s => s.id === authoring[1]) ? [authoring[1]] : []
  if (/^shared\/authoring\/missions\//.test(file)) return scenes.filter(s => s.id === 'missions').map(s => s.id)
  const worldMatch = file.match(/^shared\/authoring\/(worlds\/[^/]+\.toml)$/)
  if (worldMatch) return scenes.filter(s => s.data.includes(worldMatch[1])).map(s => s.id)

  const stem = file.replace(/\.(module\.css|test\.tsx?|spec\.tsx?)$/, '.tsx')
  const candidates = [file, stem]
  return scenes
    .filter(s => [...s.web, ...s.native, ...s.engine].some(entry => candidates.some(c => (entry.endsWith('/') ? c.startsWith(entry) : c === entry))))
    .map(s => s.id)
}

export function scenesForTicket(scenes: SceneSummary[], ticket: string): string[] {
  const key = ticket.toUpperCase()
  return scenes.filter(s => s.tickets.includes(key)).map(s => s.id)
}
