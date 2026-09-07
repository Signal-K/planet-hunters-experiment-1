'use client'

import { useEffect, useRef } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application } from 'pixi.js'
import { Scene, GameLoop, RuntimeContext } from '@/lib/engine'
import { ConstructionController } from '@/lib/engine/scripts/ConstructionController'
import type { ConstructionState } from '@/lib/engine/scripts/ConstructionController'

// Pad x-positions as fractions of 402px reference width
const PAD_FX = [0.179, 0.498, 0.816]

interface ConstructionTargetCanvasProps {
  state: ConstructionState
  selectedPad: number
  onSelectPad: (index: number) => void
}

export default function ConstructionTargetCanvas({ state, selectedPad, onSelectPad }: ConstructionTargetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ state, selectedPad, onSelectPad })
  stateRef.current = { state, selectedPad, onSelectPad }

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    const canvas = document.createElement('canvas')
    canvas.dataset.testid = 'construction-target-canvas'
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    parent.appendChild(canvas)

    const app = new Application()
    let loop: GameLoop | null = null
    let destroyed = false

    ;(async () => {
      try {
        const worldW = Math.max(280, parent.clientWidth)
        const worldH = Math.max(180, parent.clientHeight)
        const surfaceY = Math.round(worldH * 0.60)

        const [sceneData] = await Promise.all([
          Scene.load('/game/scenes/construction-target.scene.json'),
          app.init({
            canvas,
            width: worldW,
            height: worldH,
            background: 0x06090f,
            antialias: false,
            autoDensity: true,
            resolution: capDpr(),
          }),
        ])
        if (destroyed) return

        const { scene } = Scene.fromData(sceneData)

        const pads = PAD_FX.map(fx => ({
          x: Math.round(fx * worldW),
          y: surfaceY,
        }))

        const controllerObj = scene.find('construction-controller')
        const controller = new ConstructionController(new RuntimeContext(), {
          container: app.stage,
          worldWidth: worldW,
          worldHeight: worldH,
          surfaceY,
          pads,
          getState:       () => stateRef.current.state,
          getSelectedPad: () => stateRef.current.selectedPad,
          onSelectPad:    idx => stateRef.current.onSelectPad(idx),
        })
        controllerObj?.addComponent(controller)

        loop = new GameLoop(scene, app)
        loop.start()
      } catch (err) {
        console.error('[ConstructionTargetCanvas] init failed:', err)
      }
    })()

    return () => {
      destroyed = true
      loop?.stop()
      if (app.renderer) {
        try { app.destroy() } catch (_) { /* pixi v8 cleanup */ }
        canvas.remove()
      }
      // else: async init will return early (destroyed=true) then canvas is orphaned — acceptable in StrictMode
    }
  }, [])

  return <div ref={containerRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}
