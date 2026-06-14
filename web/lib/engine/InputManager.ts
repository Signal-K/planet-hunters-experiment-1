import type { Vector2 } from './types'

export type PointerEventType = 'pointerdown' | 'pointerup' | 'pointermove'

export interface PointerEvent2D {
  type: PointerEventType
  /** Position in scene/world coordinates (same space as Transform.position). */
  world: Vector2
  /** Raw position relative to the canvas element, in CSS pixels. */
  screen: Vector2
}

export type PointerListener = (event: PointerEvent2D) => void

export interface EntityBounds {
  x: number
  y: number
  width: number
  height: number
}

interface EntityRegistration {
  getBounds: () => EntityBounds
  listener: PointerListener
}

/** A rect as returned by `canvas.getBoundingClientRect()` — kept minimal for testability. */
export interface ClientRect {
  left: number
  top: number
  width: number
  height: number
}

/** Pure coordinate conversion: CSS-pixel client coordinates -> world coordinates,
 * given the canvas's on-screen rect and the world/scene size it represents. */
export function screenToWorld(
  clientX: number,
  clientY: number,
  rect: ClientRect,
  worldWidth: number,
  worldHeight: number
): Vector2 {
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }
  return {
    x: ((clientX - rect.left) / rect.width) * worldWidth,
    y: ((clientY - rect.top) / rect.height) * worldHeight,
  }
}

/** Pure hit-test: is `point` inside an axis-aligned rect centered at (x, y)? */
export function pointInBounds(point: Vector2, bounds: EntityBounds): boolean {
  const halfW = bounds.width / 2
  const halfH = bounds.height / 2
  return (
    point.x >= bounds.x - halfW &&
    point.x <= bounds.x + halfW &&
    point.y >= bounds.y - halfH &&
    point.y <= bounds.y + halfH
  )
}

/**
 * Forwards pointer events from the React GameCanvas wrapper into the runtime,
 * converting viewport coordinates to world-space and dispatching to:
 *  - global listeners (every event), and
 *  - entity-specific listeners (only when the event falls within that entity's bounds).
 */
export class InputManager {
  private canvas: HTMLCanvasElement
  private worldWidth: number
  private worldHeight: number
  private globalListeners = new Set<PointerListener>()
  private entityListeners = new Map<string, EntityRegistration>()
  private boundHandlers: Record<PointerEventType, (e: PointerEvent) => void>

  constructor(canvas: HTMLCanvasElement, worldWidth: number, worldHeight: number) {
    this.canvas = canvas
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight

    this.boundHandlers = {
      pointerdown: (e) => this.handle('pointerdown', e),
      pointerup: (e) => this.handle('pointerup', e),
      pointermove: (e) => this.handle('pointermove', e),
    }
    for (const type of Object.keys(this.boundHandlers) as PointerEventType[]) {
      this.canvas.addEventListener(type, this.boundHandlers[type])
    }
  }

  /** Update the world size used for coordinate conversion (e.g. on scene change). */
  setWorldSize(width: number, height: number): void {
    this.worldWidth = width
    this.worldHeight = height
  }

  /** Listen to every pointer event, regardless of position. Returns an unsubscribe fn. */
  onAny(listener: PointerListener): () => void {
    this.globalListeners.add(listener)
    return () => this.globalListeners.delete(listener)
  }

  /** Listen for pointer events that land within `getBounds()` for the given entity.
   * Returns an unsubscribe fn. */
  onEntity(entityId: string, getBounds: () => EntityBounds, listener: PointerListener): () => void {
    this.entityListeners.set(entityId, { getBounds, listener })
    return () => this.entityListeners.delete(entityId)
  }

  private handle(type: PointerEventType, e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const world = screenToWorld(e.clientX, e.clientY, rect, this.worldWidth, this.worldHeight)
    const event: PointerEvent2D = {
      type,
      world,
      screen: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    }

    for (const listener of this.globalListeners) listener(event)

    for (const { getBounds, listener } of this.entityListeners.values()) {
      if (pointInBounds(world, getBounds())) listener(event)
    }
  }

  destroy(): void {
    for (const type of Object.keys(this.boundHandlers) as PointerEventType[]) {
      this.canvas.removeEventListener(type, this.boundHandlers[type])
    }
    this.globalListeners.clear()
    this.entityListeners.clear()
  }
}
