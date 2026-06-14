'use client'

import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { Scene, GameLoop, InputManager, RuntimeContext, screenToWorld } from '@/lib/engine'
import { wireShapeRenderers } from '@/lib/engine/components/ShapeRenderer'
import { MiningController } from '@/lib/engine/scripts/MiningController'
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
      // Fetch the scene JSON and initialize the PixiJS renderer (WebGL context
      // creation + shader compilation) concurrently — sequencing these added
      // visible jank/delay between the transit screen and the mining scene
      // appearing, since the renderer init doesn't depend on the scene data
      // except for its background color.
      const [sceneData] = await Promise.all([
        Scene.load('/game/scenes/mining.scene.json'),
        app.init({
          canvas,
          width: WORLD_WIDTH,
          height: WORLD_HEIGHT,
          background: '#0a0a12',
          antialias: false,
          autoDensity: true,
        }),
      ])
      if (destroyed) { if (app.renderer) app.destroy(); return }
      if (sceneData.background) app.renderer.background.color = sceneData.background

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
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

// re-exported for tests that need to convert pointer events to world space
export { screenToWorld, WORLD_WIDTH, WORLD_HEIGHT }
