'use client'

import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import {
  buildHubScene,
  nullTextures,
  HUB_W,
  HUB_H,
  type HubBuildingDef,
} from '@/lib/pixi/hubScene'

interface HubPixiCanvasProps {
  buildings: HubBuildingDef[]
}

export default function HubPixiCanvas({ buildings }: HubPixiCanvasProps) {
  const divRef = useRef<HTMLDivElement>(null)
  // Keep a stable ref to buildings so the effect can see latest values
  const buildingsRef = useRef(buildings)
  buildingsRef.current = buildings

  useEffect(() => {
    const div = divRef.current
    if (!div) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    div.appendChild(canvas)

    const app = new Application()
    let scene: ReturnType<typeof buildHubScene> | null = null
    let destroyed = false

    ;(async () => {
      await app.init({
        canvas,
        width: HUB_W,
        height: HUB_H,
        backgroundAlpha: 0,
        antialias: false,   // crisp pixel art
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      })

      if (destroyed) { app.destroy(true); return }

      scene = buildHubScene(app, buildingsRef.current, nullTextures())

      let elapsed = 0
      app.ticker.add((ticker) => {
        elapsed += ticker.deltaMS / 1000
        scene?.update(elapsed, ticker.deltaMS / 1000)
      })
    })()

    return () => {
      destroyed = true
      scene?.destroy()
      app.destroy(true, { children: true })
      canvas.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // mount once — buildings update via buildingsRef

  return (
    <div
      ref={divRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    />
  )
}
