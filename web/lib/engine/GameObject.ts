import type { Vector2, TransformData, Component } from './types'

export class Transform {
  position: Vector2
  rotation: number
  scale: Vector2

  constructor(data?: Partial<TransformData>) {
    this.position = data?.position ?? { x: 0, y: 0 }
    this.rotation = data?.rotation ?? 0
    this.scale = data?.scale ?? { x: 1, y: 1 }
  }
}

export class GameObject {
  id: string
  name: string
  transform: Transform
  parent: GameObject | null = null
  children: GameObject[] = []
  components: Component[] = []
  active = true

  constructor(id: string, name: string, transform?: Partial<TransformData>) {
    this.id = id
    this.name = name
    this.transform = new Transform(transform)
  }

  addComponent(comp: Component): Component {
    comp.gameObject = this
    this.components.push(comp)
    return comp
  }

  getComponent<T extends Component>(type: string): T | null {
    return (this.components.find(c => c.type === type) as T) ?? null
  }

  addChild(child: GameObject): void {
    child.parent = this
    this.children.push(child)
  }

  start(): void {
    for (const comp of this.components) comp.start()
    for (const child of this.children) child.start()
  }

  update(dt: number): void {
    if (!this.active) return
    for (const comp of this.components) comp.update(dt)
    for (const child of this.children) child.update(dt)
  }

  destroy(): void {
    for (const comp of this.components) comp.destroy()
    for (const child of this.children) child.destroy()
  }
}
