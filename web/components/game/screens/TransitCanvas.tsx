'use client'

import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { buildTransitScene, type TargetKind } from '@/lib/pixi/transitScene'

interface TransitCanvasProps {
  targetName: string
  targetKind: TargetKind
  rocketImageSrc?: string
  progress: number
}

export default function TransitCanvas({ targetName, targetKind, rocketImageSrc, progress }: TransitCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(progress)
  progressRef.current = progress

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    parent.appendChild(canvas)

    const app = new Application()
    let scene: ReturnType<typeof buildTransitScene> | null = null
    let destroyed = false

    ;(async () => {
      try {
        const worldWidth = Math.max(280, parent.clientWidth)
        const worldHeight = Math.max(260, parent.clientHeight)
        await app.init({
          canvas,
          width: worldWidth,
          height: worldHeight,
          background: 0x010508,
          antialias: false,
          autoDensity: true,
          resolution: capDpr(),
        })
        if (destroyed) return

        scene = buildTransitScene(app, {
          targetName,
          targetKind,
          rocketImageSrc,
          renderRocket: false,
          getProgress: () => progressRef.current,
        })
        app.ticker.add(() => {
          if (scene) scene.update(app.ticker.lastTime / 1000, app.ticker.deltaMS / 1000)
        })
      } catch (error) {
        console.error('[TransitCanvas] init failed:', error)
      }
    })()

    return () => {
      destroyed = true
      if (app.renderer) {
        try { app.destroy() } catch (_) { /* pixi v8 cleanup */ }
      }
      canvas.remove()
    }
  }, [rocketImageSrc, targetKind, targetName])

  const rocketTop = `${88 - Math.min(42, progress * 0.42)}%`

  return (
    <div ref={containerRef} className="transit-game-canvas">
      <img
        data-testid="transit-rocket"
        className="transit-rocket-sprite"
        src={rocketImageSrc ?? '/game/assets/ships/ship_sr1.png'}
        alt=""
        aria-hidden="true"
        style={{ top: rocketTop }}
      />
    </div>
  )
}
