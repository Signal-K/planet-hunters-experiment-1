'use client'

import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { AcademyController, GameLoop, RuntimeContext, Scene } from '@/lib/engine'

export default function AcademyCanvas({ activeTraining, funded }: { activeTraining: number; funded: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ activeTraining, funded })
  stateRef.current = { activeTraining, funded }

  useEffect(() => {
    const parent = ref.current
    if (!parent) return
    const canvas = document.createElement('canvas')
    canvas.dataset.testid = 'academy-canvas'
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    parent.appendChild(canvas)
    const app = new Application()
    let loop: GameLoop | null = null
    let destroyed = false

    ;(async () => {
      try {
        const width = Math.max(300, parent.clientWidth)
        const height = Math.max(190, parent.clientHeight)
        const [data] = await Promise.all([
          Scene.load('/game/scenes/academy.scene.json'),
          app.init({ canvas, width, height, background: 0xe9edf2, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 }),
        ])
        if (destroyed) return
        const { scene } = Scene.fromData(data)
        scene.find('academy-controller')?.addComponent(new AcademyController(new RuntimeContext(), {
          container: app.stage,
          worldWidth: width,
          worldHeight: height,
          getActiveTraining: () => stateRef.current.activeTraining,
          getFunded: () => stateRef.current.funded,
        }))
        loop = new GameLoop(scene, app)
        loop.start()
      } catch (error) {
        console.error('[AcademyCanvas] init failed:', error)
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
  }, [])

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />
}
