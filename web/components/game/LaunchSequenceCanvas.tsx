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

// KES-148: on the deployed build (not local dev/Cypress), this scene was
// observed replaying from the ground indefinitely, stranding the player on
// the fab screen forever with no way to launch. Root cause wasn't fully
// pinned down, but the scene's completion effect below only fires once per
// mount and this component's own useEffect remounts (resetting elapsed to 0)
// whenever rocketName/rocketImageSrc/targetName change value — plausible if
// game.rocket transiently resolves to a different value across a slower
// production catalog/state sync than local dev ever exercises. This watchdog
// is a mount-once safety net, independent of those props, so no remount loop
// can strand a player: worst case they wait a fixed ceiling, not forever.
const LAUNCH_WATCHDOG_MS = 12_000

export function LaunchSequenceCanvas({ rocketName, rocketImageSrc, targetName, onComplete }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const completeRef = useRef(onComplete)
  const firedRef = useRef(false)
  completeRef.current = onComplete

  // Single guarded entry point — the watchdog, the scene's natural
  // completion, and the dev skip button all route through this so a
  // near-simultaneous fire from two of them can never call onComplete twice.
  const fireComplete = useRef(() => {
    if (firedRef.current) return
    firedRef.current = true
    completeRef.current()
  }).current

  useEffect(() => {
    const timer = window.setTimeout(fireComplete, LAUNCH_WATCHDOG_MS)
    return () => window.clearTimeout(timer)
  }, [fireComplete])

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
        onComplete: fireComplete,
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
          onClick={fireComplete}
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
      )}
    </div>
  )
}
