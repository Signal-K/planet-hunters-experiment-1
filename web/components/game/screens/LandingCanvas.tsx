'use client'

import { useEffect, useRef } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application } from 'pixi.js'
import { GameLoop, LandingController, RuntimeContext, Scene } from '@/lib/engine'
import type { LandingSequenceMode } from '@/lib/engine/scripts/LandingController'

interface LandingCanvasProps {
  progress: number
  mode: LandingSequenceMode
}

export default function LandingCanvas({ progress, mode }: LandingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(progress)
  progressRef.current = progress

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    const canvas = document.createElement('canvas')
    canvas.dataset.testid = 'landing-canvas'
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    parent.appendChild(canvas)

    const app = new Application()
    let loop: GameLoop | null = null
    let destroyed = false

    ;(async () => {
      try {
        const worldWidth = Math.max(280, parent.clientWidth)
        const worldHeight = Math.max(260, parent.clientHeight)
        const [sceneData] = await Promise.all([
          Scene.load('/game/scenes/landing.scene.json'),
          app.init({
            canvas,
            width: worldWidth,
            height: worldHeight,
            background: 0x07101c,
            antialias: false,
            autoDensity: true,
            resolution: capDpr(),
          }),
        ])
        if (destroyed) return

        const { scene } = Scene.fromData(sceneData)
        const controller = new LandingController(new RuntimeContext(), {
          container: app.stage,
          worldWidth,
          worldHeight,
          mode,
          getProgress: () => progressRef.current,
        })
        scene.find('landing-controller')?.addComponent(controller)
        loop = new GameLoop(scene, app)
        loop.start()
      } catch (error) {
        console.error('[LandingCanvas] init failed:', error)
      }
    })()

    return () => {
      destroyed = true
      loop?.stop()
      if (app.renderer) {
        try { app.destroy() } catch (_) { /* pixi v8 cleanup */ }
      }
      canvas.remove()
    }
  }, [mode])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
