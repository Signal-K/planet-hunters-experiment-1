// What the Studio's page and API route share: where the repo is, which fixtures exist, and how to load a scene.
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { allFixtureKeys, fixturesForRoute } from './fixtures'
import { focusPath } from './focus'
import { bundleSignature, loadDataDoc, loadIndex, loadSceneBundle, sceneFiles } from './studio-server'
import type { StudioIndex } from './studio-types'
import type { AuthoringContext } from './validate'
import { AUTHORING_DIR, loadContext } from './validate'

/** Dev only. In Docker the repo is mounted at LANDNAM_REPO_ROOT; locally it is the parent of web/. */
export const studioRoot = (): string => process.env.LANDNAM_REPO_ROOT ?? resolve(process.cwd(), '..')

export const studioEnabled = (): boolean => process.env.NODE_ENV === 'development'

export const studioContext = (): AuthoringContext => loadContext(studioRoot(), allFixtureKeys())

export const loadScene = (id: string) => loadSceneBundle(studioRoot(), id, studioContext(), fixturesForRoute, process.env.LANDNAM_HOST_ROOT)

export const loadData = (kind: 'world' | 'mission', id: string) => loadDataDoc(studioRoot(), kind, id, studioContext())

/**
 * Size and modification time of every file the index is built from. The Studio polls the index every few seconds, and
 * validating every script each time costs 50 to 200ms (more on a busy container). A poll that finds nothing changed now
 * costs a few stats instead.
 */
function indexSignature(root: string): string {
  const parts: string[] = []
  const stat = (abs: string) => {
    try { const s = statSync(abs); parts.push(`${abs}:${s.size}:${s.mtimeMs}`) } catch { parts.push(`${abs}:-`) }
  }
  for (const dir of ['scenes', 'feedback', 'worlds', 'missions', 'flows']) {
    const abs = join(root, AUTHORING_DIR, dir)
    if (!existsSync(abs)) continue
    for (const name of readdirSync(abs).sort()) stat(join(abs, name))
  }
  for (const rel of ['qa/scenes.json', 'shared/engine/scene-types.json', 'shared/engine/mechanics.json', 'shared/engine/game-map.generated.json', 'web/lib/game-types.ts']) stat(join(root, rel))
  stat(focusPath(root))
  return parts.join('|')
}

/** Validation also looks at files the signature does not (a source file a script names being renamed), so a cached index expires. */
const INDEX_MAX_AGE_MS = 30_000
let indexCache: { sig: string; at: number; value: StudioIndex } | null = null

export const loadStudioIndex = (): StudioIndex => {
  const root = studioRoot()
  const sig = indexSignature(root)
  const now = Date.now()
  if (indexCache && indexCache.sig === sig && now - indexCache.at < INDEX_MAX_AGE_MS) return indexCache.value
  const value = loadIndex(root, studioContext())
  indexCache = { sig, at: now, value }
  return value
}

export const sceneSignature = (id: string): string => bundleSignature(studioRoot(), sceneFiles(id))

export const dataSignature = (kind: 'world' | 'mission', id: string): string => bundleSignature(studioRoot(), [`${AUTHORING_DIR}/${kind === 'world' ? 'worlds' : 'missions'}/${id}.toml`])
