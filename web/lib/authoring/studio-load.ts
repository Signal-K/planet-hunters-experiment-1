// What the Studio's page and API route share: where the repo is, which fixtures exist, and how to load a scene.
import { resolve } from 'node:path'
import { allFixtureKeys, fixturesForRoute } from './fixtures'
import { bundleSignature, loadDataDoc, loadIndex, loadSceneBundle, sceneFiles } from './studio-server'
import type { AuthoringContext } from './validate'
import { AUTHORING_DIR, loadContext } from './validate'

/** Dev only. In Docker the repo is mounted at LANDNAM_REPO_ROOT; locally it is the parent of web/. */
export const studioRoot = (): string => process.env.LANDNAM_REPO_ROOT ?? resolve(process.cwd(), '..')

export const studioEnabled = (): boolean => process.env.NODE_ENV === 'development'

export const studioContext = (): AuthoringContext => loadContext(studioRoot(), allFixtureKeys())

export const loadScene = (id: string) => loadSceneBundle(studioRoot(), id, studioContext(), fixturesForRoute, process.env.LANDNAM_HOST_ROOT)

export const loadData = (kind: 'world' | 'mission', id: string) => loadDataDoc(studioRoot(), kind, id, studioContext())

export const loadStudioIndex = () => loadIndex(studioRoot(), studioContext())

export const sceneSignature = (id: string): string => bundleSignature(studioRoot(), sceneFiles(id))

export const dataSignature = (kind: 'world' | 'mission', id: string): string => bundleSignature(studioRoot(), [`${AUTHORING_DIR}/${kind === 'world' ? 'worlds' : 'missions'}/${id}.toml`])
