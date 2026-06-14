import type { Component, ComponentData } from '../types'
import type { GameObject } from '../GameObject'
import type { RuntimeContext } from '../RuntimeContext'

/**
 * Base class for user-defined game logic. Subclass and override start/update/destroy,
 * then register with `gameObject.addComponent(new MyScript(context))` — no reflection
 * or decorators required.
 *
 * `context` is the mount-time RuntimeContext (auth/session) forwarded from the React
 * GameCanvas wrapper, available to subclasses via `this.context`.
 */
export abstract class ScriptBehaviour implements Component {
  readonly type: string = 'ScriptBehaviour'
  gameObject!: GameObject
  protected context: RuntimeContext

  constructor(context: RuntimeContext) {
    this.context = context
  }

  start(): void {}
  update(_dt: number): void {}
  destroy(): void {}

  /** Scripts are identified by class name for scene-file references; they are not
   * deserialized generically (no reflection) — a scene's wiring code is responsible
   * for mapping `scriptName` back to a concrete ScriptBehaviour subclass. */
  toJSON(): ComponentData {
    return { type: 'ScriptBehaviour', scriptName: this.constructor.name }
  }
}
