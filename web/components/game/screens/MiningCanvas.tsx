'use client'

import { useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'
import { Scene, GameLoop, InputManager, RuntimeContext, screenToWorld } from '@/lib/engine'
import { wireShapeRenderers } from '@/lib/engine/components/ShapeRenderer'
import { MiningController, SHIP_X, SHIP_Y, SURFACE_Y } from '@/lib/engine/scripts/MiningController'
import type { MineralMeta } from '@/lib/data'

const WORLD_WIDTH = 600
const WORLD_HEIGHT = 300

interface MiningCanvasProps {
  minerals: string[]
  mineralMeta: Record<string, MineralMeta>
  onCollect: (mineral: string) => void
  /** Imperative handle: parent calls this to fire a laser (e.g. from a button). */
  fireRef: React.MutableRefObject<(() => void) | null>
}

const SKY_COLOR = 0x03060c

function buildStars(): Graphics {
  const g = new Graphics()
  // Deterministic star positions (fractions of world width × sky height)
  const stars: [number, number, number, number][] = [
    [0.08, 0.13, 1.2, 0.30], [0.20, 0.42, 0.8, 0.18], [0.35, 0.08, 1.5, 0.28],
    [0.44, 0.55, 1.0, 0.15], [0.55, 0.22, 0.9, 0.22], [0.63, 0.48, 1.2, 0.12],
    [0.72, 0.10, 1.0, 0.25], [0.80, 0.35, 0.8, 0.18], [0.88, 0.58, 1.3, 0.20],
    [0.15, 0.60, 1.0, 0.14], [0.50, 0.38, 1.5, 0.10], [0.92, 0.25, 1.0, 0.22],
    [0.28, 0.30, 0.8, 0.16], [0.68, 0.62, 1.2, 0.18], [0.04, 0.75, 1.0, 0.12],
  ]
  for (const [fx, fy, r, alpha] of stars) {
    g.circle(fx * WORLD_WIDTH, fy * (SURFACE_Y - 8), r).fill({ color: 0xffffff, alpha })
  }
  return g
}

function buildSurface(): Graphics {
  const g = new Graphics()
  // Base rock fill
  g.rect(0, SURFACE_Y + 6, WORLD_WIDTH, WORLD_HEIGHT - SURFACE_Y - 6).fill(0x1a1006)
  // Jagged rocky edge — deterministic heights so it doesn't change on hot-reload
  const ridgeH = [0, -10, -14, -7, -18, -11, -5, -16, -12, -8, -15, -9, -19, -6, -13, -10, -17, -4, -11, -8]
  const edge: number[] = [0, WORLD_HEIGHT]
  for (let i = 0; i <= WORLD_WIDTH; i += 16) {
    edge.push(i, SURFACE_Y + 6 + ridgeH[Math.floor(i / 16) % ridgeH.length])
  }
  edge.push(WORLD_WIDTH, WORLD_HEIGHT)
  g.poly(edge).fill(0x2d1e0c)
  // Rock texture: dark crater patches
  const patches: [number, number][] = [
    [45, 14], [110, 22], [185, 10], [250, 18], [330, 12],
    [400, 20], [465, 9], [535, 16], [80, 26], [210, 8], [355, 24], [505, 14],
  ]
  for (const [px, pr] of patches) {
    g.circle(px, SURFACE_Y + 22, pr).fill({ color: 0x110c04, alpha: 0.6 })
  }
  return g
}

function buildShip(): Graphics {
  const g = new Graphics()
  // Engine glow
  g.circle(-22, 0, 9).fill({ color: 0xff6600, alpha: 0.55 })
  g.circle(-20, 0, 5).fill({ color: 0xffcc44, alpha: 0.8 })
  // Wing fins (top and bottom)
  g.poly([-10, 7, 6, 7, 2, 22, -14, 22]).fill(0x1b3d78)
  g.poly([-10, -7, 6, -7, 2, -22, -14, -22]).fill(0x1b3d78)
  // Main fuselage
  g.rect(-16, -8, 38, 16).fill(0x2c6ab5)
  // Nose cone
  g.poly([22, -8, 37, 0, 22, 8]).fill(0x6ab4f0)
  // Engine bell
  g.rect(-24, -7, 9, 14).fill(0x142848)
  // Cockpit
  g.circle(6, 0, 5).fill(0x0f2036)
  g.circle(6, 0, 3).fill(0x4aaaff)
  g.x = SHIP_X
  g.y = SHIP_Y
  return g
}

function buildAimGuide(): Graphics {
  const g = new Graphics()
  for (let y = SHIP_Y + 22; y < SURFACE_Y - 10; y += 11) {
    g.circle(SHIP_X, y, 1.2).fill({ color: 0x9becff, alpha: 0.18 })
  }
  return g
}

export default function MiningCanvas({ minerals, mineralMeta, onCollect, fireRef }: MiningCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onCollectRef = useRef(onCollect)
  onCollectRef.current = onCollect

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const app = new Application()
    let loop: GameLoop | null = null
    let input: InputManager | null = null
    let destroyed = false

    ;(async () => {
      const [sceneData] = await Promise.all([
        Scene.load('/game/scenes/mining.scene.json'),
        app.init({
          canvas,
          width: WORLD_WIDTH,
          height: WORLD_HEIGHT,
          background: SKY_COLOR,
          antialias: false,
          autoDensity: true,
        }),
      ])
      if (destroyed) { if (app.renderer) app.destroy(); return }

      // autoDensity sets px inline sizes; override so canvas fills the 2:1 viewport
      canvas.style.width = '100%'
      canvas.style.height = '100%'

      // Stars in sky, then asteroid surface at bottom
      app.stage.addChildAt(buildStars(), 0)
      app.stage.addChildAt(buildSurface(), 1)

      const { scene, entityData } = Scene.fromData(sceneData)
      wireShapeRenderers(app.stage, entityData, scene)

      const controllerObj = scene.find('mining-controller')
      const controller = new MiningController(new RuntimeContext(), {
        container: app.stage,
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
        minerals,
        mineralColors: Object.fromEntries(Object.entries(mineralMeta).map(([id, m]) => [id, m.color])),
        onCollect: mineral => onCollectRef.current(mineral),
      })
      controllerObj?.addComponent(controller)

      input = new InputManager(canvas, WORLD_WIDTH, WORLD_HEIGHT)
      input.onAny(event => {
        if (event.type === 'pointerdown') controller.fireLaser()
      })
      fireRef.current = () => controller.fireLaser()

      loop = new GameLoop(scene, app)
      loop.start()

      // Ship and aim guide added last — always render above ores/lasers
      // (ship at y=72, ores at y=190 — no spatial overlap regardless of z-order)
      app.stage.addChild(buildAimGuide())
      app.stage.addChild(buildShip())
    })()

    return () => {
      destroyed = true
      fireRef.current = null
      loop?.stop()
      input?.destroy()
      if (app.renderer) app.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      data-testid="mining-canvas"
      className="mining-canvas"
    />
  )
}

// re-exported for tests that need to convert pointer events to world space
export { screenToWorld, WORLD_WIDTH, WORLD_HEIGHT }
