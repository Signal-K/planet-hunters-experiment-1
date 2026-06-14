export interface Vector2 {
  x: number
  y: number
}

export interface TransformData {
  position: Vector2
  rotation: number
  scale: Vector2
}

export interface ComponentData {
  type: string
  [key: string]: unknown
}

export interface EntityData {
  id: string
  name: string
  transform: TransformData
  components: ComponentData[]
  children?: EntityData[]
}

export interface SceneData {
  name: string
  background?: string
  entities: EntityData[]
}

export interface Component {
  readonly type: string
  gameObject: GameObject
  start(): void
  update(dt: number): void
  destroy(): void
  toJSON(): ComponentData
}

// Forward declaration — filled by GameObject import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GameObject = any
