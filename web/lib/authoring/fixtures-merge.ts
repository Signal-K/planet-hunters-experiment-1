// A scene may keep its states, things and presets in shared/authoring/fixtures/<id>.toml so the scene script stays small.
// Everything that reads a scene sees one merged text (scene, a marker line, fixtures); writes are split back at the marker.
// Table indexes are per array, so an edit path like ['presets', 2, 'things'] means the same in both files.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Diagnostic } from './validate.ts'

export const FIXTURE_TABLES = new Set(['states', 'things', 'presets'])
const SCENE_FILE = /^shared\/authoring\/scenes\/([a-z0-9][a-z0-9-]*)\.toml$/

export const fixturesFile = (relPath: string): string | null => {
  const m = SCENE_FILE.exec(relPath.replaceAll('\\', '/'))
  return m ? `shared/authoring/fixtures/${m[1]}.toml` : null
}
export const markerFor = (fixtures: string): string => `# ---- fixtures: ${fixtures} (edit them here, they save to that file) ----\n`
const MARKER = /^# ---- fixtures: (\S+) \(edit them here, they save to that file\) ----\n/m

const withNewline = (text: string): string => (text.endsWith('\n') ? text : `${text}\n`)

/** The scene text as every reader should see it: scene script, then its fixtures when the sibling file exists. */
export function readSceneText(root: string, relPath: string, overlay?: Record<string, string>): string {
  const read = (rel: string): string | null => overlay?.[rel] ?? (existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8') : null)
  const scene = read(relPath) ?? ''
  const fixtures = fixturesFile(relPath)
  const extra = fixtures ? read(fixtures) : null
  return extra === null || !fixtures ? scene : `${withNewline(scene)}\n${markerFor(fixtures)}${extra}`
}

/** Inverse of readSceneText: the scene part and the fixtures part of a merged text. */
export function splitSceneText(text: string): { scene: string; fixtures: { file: string; text: string } | null } {
  const m = MARKER.exec(text)
  if (!m) return { scene: text, fixtures: null }
  return { scene: text.slice(0, m.index).replace(/\n+$/, '\n'), fixtures: { file: m[1], text: text.slice(m.index + m[0].length) } }
}

/** Diagnostics from a merged text point at the file and line they really live in. */
export function remapDiagnostics(text: string, diagnostics: Diagnostic[]): Diagnostic[] {
  const m = MARKER.exec(text)
  if (!m) return diagnostics
  const markerLine = text.slice(0, m.index).split('\n').length
  const file = m[1]
  return diagnostics.map(d => d.line > markerLine ? { ...d, file, line: d.line - markerLine, endLine: d.endLine - markerLine } : d)
}
