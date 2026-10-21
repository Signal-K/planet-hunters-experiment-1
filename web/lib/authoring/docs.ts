// The shapes of the authoring documents after they have passed their JSON Schema. Mirrors shared/authoring/schema/*.json.

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface SceneObject {
  id: string
  kind: string
  parent?: string
  slot?: string
  rect?: Rect
  prefab?: string
  asset?: string
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
  objects?: SceneObject[]
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
