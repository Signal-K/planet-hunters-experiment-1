// The shapes of the authoring documents after they have passed their JSON Schema. Mirrors shared/authoring/schema/*.json.

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Source-backed ownership, deliberately distinct from tested behavior parity. */
export interface MechanicContract {
  id: string
  name: string
  web: string[]
  native: string[]
  components: string[]
  note: string
}

/** Target experience composition. Not a second router or a migration of saved screen values. */
export interface JourneyContract {
  status: 'target-not-routing'
  source: string
  stages: { id: string; name: string; routes: string[]; policy: string }[]
}

export interface SceneObject {
  id: string
  kind: string
  parent?: string
  slot?: string
  rect?: Rect
  space?: 'safe-area' | 'parent'
  layout?: 'host' | 'shared'
  mechanics?: string[]
  action?: 'choose-mission'
  prefab?: string
  asset?: string
  nativeAsset?: string
  components?: string[]
  bindings?: Record<string, unknown>
  label?: string
  status?: 'implemented' | 'proposed'
  note?: string
}

export interface SceneState {
  id: string
  label: string
  preset: string
  patch?: Record<string, unknown>
  note?: string
}

/** One thing that can be in a scene. Switching it on layers `state` and `query` over the scene's starting point. */
export interface Thing {
  id: string
  label: string
  group?: string
  note?: string
  /** Things sharing a value here are choices: only one at a time. */
  exclusive?: string
  default?: boolean
  /** Merged over the game state: tables merge, lists gain entries, anything else is replaced. */
  state?: Record<string, unknown>
  /** URL knobs of the stage, such as time and sky. Several things on the same key are joined with commas. */
  query?: Record<string, string>
  /** A slider. Always applied; `{value}` and `{rest}` (max minus value) can be used inside `state` strings. */
  range?: { min: number; max: number; step?: number; value: number }
}

/** A named setup of a scene: which things are on, and plain-language instructions for whoever tests or builds it. */
export interface ScenePreset {
  id: string
  name: string
  things?: string[]
  values?: Record<string, number>
  instructions?: string
}

export interface SceneDoc {
  format: 1
  id: string
  type: string
  name: string
  summary?: string
  tickets?: string[]
  qa?: string[]
  runtime: { surface: 'canvas' | 'dom'; web?: string[]; native?: string[]; engine?: string[]; data?: string[] }
  preview: { route: string; state?: string }
  states?: SceneState[]
  things?: Thing[]
  presets?: ScenePreset[]
  objects?: SceneObject[]
}

export interface FlowStep {
  scene: string
  preset?: string
  title: string
  instructions?: string
}

/** A mission or sequence as a script: scenes in order, each with the setup to open and what to do or check there. */
export interface FlowDoc {
  format: 1
  id: string
  name: string
  summary?: string
  tickets?: string[]
  steps: FlowStep[]
}

export interface MissionDoc {
  format: 1
  id: string
  title: string
  brief: string
  tag: string
  difficulty: string
  client?: string
  locked: boolean
  sequence: number | 'transport' | 'free-ops'
  unlock_at?: string
  target?: string
  delivery_target?: string
  requires: { minerals: Record<string, number>; cargo_min: number; drill_tier: number; max_orbit: number }
  payout: { francs?: number; floor_sequence?: number; affinity: number }
  tickets?: string[]
  preview?: { route?: string; state?: string }
  note?: string
}

export interface WorldEntity {
  id?: string
  sprite?: string
  emit?: { prefab: string; every: number }
  [key: string]: unknown
}

export interface WorldDoc {
  format: 1
  version: number
  about?: string
  physics: Record<string, number>
  sprites: Record<string, { src: string; w: number; h: number; x0: number; v0: number }>
  entities: WorldEntity[]
  prefabs: Record<string, WorldEntity>
  biomes: Record<string, WorldEntity[]>
}

export interface Pin {
  kind: 'wrong' | 'keep'
  note: string
  at?: { x: number; y: number }
  viewport?: 'ph' | 'ls' | 'dk'
  state?: string
  object?: string
  resolved?: boolean
}

export interface Inspiration {
  source?: string
  image?: string
  likes?: string
}

export interface FeedbackDoc {
  format: 1
  scene: string
  mode?: 'fix' | 'explore'
  status?: 'open' | 'addressed'
  direction?: string
  pins?: Pin[]
  inspiration?: Inspiration[]
}
