'use client'

import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { buildLaunchScene, LAUNCH_W, LAUNCH_H } from '@/lib/pixi/launchScene'

interface Props {
  rocketName: string
  rocketImageSrc?: string
  targetName: string
  onComplete: () => void
}

export function LaunchSequenceCanvas({ rocketName, rocketImageSrc, targetName, onComplete }: Props) {
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
        rocketImageSrc,
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
  }, [rocketImageSrc, rocketName, targetName])

  return (
    <div
      ref={divRef}
      style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden', zIndex: 100 }}
    >
      {process.env.NODE_ENV === 'development' && (
        <button
          data-testid="launch-sequence-skip-btn"
          onClick={() => completeRef.current()}
          style={{
            position: 'absolute', bottom: 24, right: 24, zIndex: 101,
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            background: 'rgba(8,16,28,0.72)', border: '1px solid rgba(126,200,255,0.4)',
            color: '#7ec8ff', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 11,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}
        >
          Skip ▸
        </button>
      )}
    </div>
  )
}
