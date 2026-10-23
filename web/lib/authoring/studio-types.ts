// Shapes shared by the Scene Studio's server and client. Plain data only, so it crosses the network unchanged.
import type { Schema } from './schema.ts'
import type { Diagnostic } from './validate.ts'
import type { EditOp } from './edit.ts'

export interface Fixture {
  key: string
  label: string
  hint?: string
  group?: string
  /** Listed in the scene script's [[states]] rather than found automatically. */
  curated?: boolean
}

export interface DocBundle {
  file: string
  exists: boolean
  text: string
  hash: string
  value: Record<string, unknown> | null
  diagnostics: Diagnostic[]
}

export interface SceneBundle {
  id: string
  scene: DocBundle
  feedback: DocBundle
  notes: { always: string; next: string; alwaysFile: string; nextFile: string }
  fixtures: Fixture[]
  /** Native snapshot name per stage fixture, from the qa ids this scene links to (qa/scenes.json). */
  nativeByFixture: Record<string, string>
  slots: Record<string, { x: number; y: number; w: number; h: number; layer: string }>
  sceneSlots: string[]
  schemas: { scene: Schema; feedback: Schema }
  /** Absolute path of the repo on the host, when known, for editor deep links. */
  hostRoot?: string
  /** Changes whenever any file behind this bundle changes. */
  sig: string
}

export interface DataDocBundle {
  kind: 'world' | 'mission'
  id: string
  doc: DocBundle
  schema: Schema
  /** Scene to preview this in, and the fixture. */
  previewScene: string
  previewState?: string
  sig: string
}

/** A flow as the Studio's picker and step strip need it. */
export interface FlowSummary {
  id: string
  name: string
  summary: string
  file: string
  steps: { scene: string; preset?: string; title: string; instructions?: string }[]
  errors: number
}

export interface StudioIndex {
  scenes: import('./scenes.ts').SceneSummary[]
  flows: FlowSummary[]
  data: { kind: 'world' | 'mission'; id: string; title: string; file: string; errors: number }[]
  focus: import('./focus.ts').Focus | null
  inventory: {
    counts: {
      webRoutes: number
      nativeScreenCases: number
      authoredSceneScripts: number
      authoredObjectNodes: number
      authoredGameObjects: number
      authoredUiElements: number
      authoredPrefabInstances: number
      mechanics: number
      sharedLayoutObjects: number
      hostLayoutObjects: number
    }
    gaps: {
      scenesWithoutObjects: string[]
      routesWithoutNativeCase: string[]
      mechanicsWithoutNativeSources: string[]
      unownedDomainFiles: string[]
    }
    scenes: { id: string; sharedLayoutObjects: number; hostLayoutObjects: number; mechanics: string[]; web: string[]; native: string[] }[]
    mechanics: import('./docs').MechanicContract[]
    journey?: import('./docs').JourneyContract
  }
}

export type StudioRequest =
  | { action: 'edit'; file: string; ops: EditOp[]; expectHash?: string }
  | { action: 'write'; file: string; text: string; expectHash?: string }
  | { action: 'note'; scene: string; which: 'always' | 'next'; text: string }
  | { action: 'promote'; scene: string }
  | { action: 'ref'; scene: string; dataUrl: string }
  | { action: 'focus'; scenes: string[]; ticket?: string }
  | { action: 'compile' }

export interface CompileSummary {
  ok: boolean
  written: string[]
  errors: number
}

export type StudioResponse =
  | { ok: true; before?: string; doc?: DocBundle; compile?: CompileSummary; ref?: string }
  | { ok: false; error: string; stale?: boolean }

/** What `POST /api/dev/studio/open` answers when the page asks for a script to be opened in the editor. */
export type OpenResponse =
  | { ok: true; file: string; line?: number; command?: string }
  | { ok: false; reason: 'bad-request' | 'helper-offline' | 'editor-failed' | 'forbidden' | 'not-found'; message: string }
