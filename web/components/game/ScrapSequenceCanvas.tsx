'use client'

import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { buildScrapScene, SCRAP_W, SCRAP_H } from '@/lib/pixi/scrapScene'

interface Props {
  rocketImageSrc?: string
  onComplete: () => void
}

/**
 * Debrief-only scrap/dismantle sequence for single-use starter rockets
 * (SR1-SR5 during M1-M3 onboarding — see rocket-and-room-system decision).
 * Once reusable rockets ship, callers should skip mounting this entirely
 * for a reusable hull rather than branching inside it.
 */
export function ScrapSequenceCanvas({ rocketImageSrc, onComplete }: Props) {
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
      const cw = div.offsetWidth || SCRAP_W
      const ch = div.offsetHeight || SCRAP_H
      await app.init({
        canvas,
        width: cw,
        height: ch,
        background: 0x06090f,
        antialias: true,
        autoDensity: true,
        resolution: typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1,
      })
      initialized = true
      if (destroyed) { try { app.destroy() } catch (_) { /* pixi v8 cleanup */ } canvas.remove(); return }

      const scene = buildScrapScene(app, {
        rocketImageSrc,
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
  }, [rocketImageSrc])

  return (
    <div
      ref={divRef}
      style={{ position: 'absolute', inset: 0, background: '#06090f', overflow: 'hidden', zIndex: 100 }}
    >
      {process.env.NODE_ENV === 'development' && (
        <button
          data-testid="scrap-sequence-skip-btn"
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
