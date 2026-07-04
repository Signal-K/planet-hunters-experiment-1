'use client'

import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { buildLaunchScene, LAUNCH_W, LAUNCH_H } from '@/lib/pixi/launchScene'

interface Props {
  rocketName: string
  targetName: string
  onComplete: () => void
}

export function LaunchSequenceCanvas({ rocketName, targetName, onComplete }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    const div = divRef.current
    if (!div) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%;'
    div.appendChild(canvas)

    const app = new Application()
    let initialized = false
    let destroyed = false
    let elapsed = 0

    ;(async () => {
      const cw = div.offsetWidth  || LAUNCH_W
      const ch = div.offsetHeight || LAUNCH_H
      await app.init({
        canvas,
        width: cw,
        height: ch,
        background: 0x000000,
        antialias: true,
        autoDensity: true,
        resolution: typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1,
      })
      initialized = true
      if (destroyed) { try { app.destroy() } catch (_) { /* pixi v8 cleanup */ } canvas.remove(); return }

      const scene = buildLaunchScene(app, {
        rocketName,
        targetName,
        onComplete: () => completeRef.current(),
      })

      app.ticker.add(t => {
        elapsed += t.deltaTime / 60
        scene.update(elapsed, t.deltaTime / 60)
      })
    })()

    return () => {
      destroyed = true
      if (initialized) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
        canvas.remove()
      }
    }
  }, [])

  return (
    <div
      ref={divRef}
      style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden', zIndex: 100 }}
    />
  )
}
