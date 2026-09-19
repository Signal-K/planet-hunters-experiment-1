'use client'

import { useEffect, useRef } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application } from 'pixi.js'
import { buildScrapScene, SCRAP_W, SCRAP_H } from '@/lib/pixi/scrapScene'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import SequenceDesktopFrame from '@/components/game/SequenceDesktopFrame'

interface Props {
  rocketImageSrc?: string
  onComplete: () => void
}

/**
 * Debrief-only scrap/dismantle sequence for single-use rocket models
 * (every model is single-use during M1-M3 onboarding — see rocket-and-room-system decision).
 * Once reusable rockets ship, callers should skip mounting this entirely
 * for a reusable hull rather than branching inside it.
 */
export function ScrapSequenceCanvas({ rocketImageSrc, onComplete }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete
  // The stage resizes when the desktop frame kicks in; rebuild the scene then so it lays out at the real size.
  const isDesktop = useIsDesktop()

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

    void (async () => {
      try {
        const cw = div.offsetWidth || SCRAP_W
        const ch = div.offsetHeight || SCRAP_H
        await app.init({
          canvas,
          width: cw,
          height: ch,
          background: 0x050b16, // --ln-void mirror for the Pixi renderer
          antialias: false,
          autoDensity: true,
          resolution: capDpr(),
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
      } catch {
        // JSDOM has no 2D canvas context. Keep the debrief testable while the
        // real browser continues to render the Pixi teardown sequence.
        canvas.remove()
      }
    })()

    return () => {
      destroyed = true
      if (initialized) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
        canvas.remove()
      }
    }
  }, [rocketImageSrc, isDesktop])

  return (
    <SequenceDesktopFrame
      background="var(--ln-void)"
      stageAspect="4 / 3"
      stageMaxWidth={720}
      leftTitle="RECOVERY"
      leftRows={[
        { label: 'PROCEDURE', value: 'VEHICLE TEARDOWN' },
        { label: 'HULL', value: 'SINGLE-USE' },
      ]}
      rightTitle="TEARDOWN STATUS"
      rightRows={[
        { label: 'SEQUENCE', value: 'AUTOMATED' },
        { label: 'RESULT', value: 'HULL RETIRED' },
      ]}
      renderStage={style => <div ref={divRef} data-testid="scrap-sequence-stage" style={{ background: 'var(--ln-void)', ...style }} />}
    >
      {/* Player-facing skip, not dev-only (KES-316) — this overlay auto-plays
          and blocks the ledger reveal on every early-onboarding debrief with
          no other affordance. */}
      <button
        data-testid="scrap-sequence-skip-btn"
        onClick={() => completeRef.current()}
        style={{
          position: 'absolute', bottom: 24, right: 24, zIndex: 101,
          padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(20,20,23,0.72)', border: '1px solid rgba(112,217,234,0.4)',
          color: '#7ec8ff', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 11,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}
      >
        Skip ▸
      </button>
    </SequenceDesktopFrame>
  )
}
