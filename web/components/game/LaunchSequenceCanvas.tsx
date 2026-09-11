'use client'

import { useEffect, useRef } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
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
const LAUNCH_WATCHDOG_MS = 18_000

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

  // KES-353: the watchdog above used a single fixed setTimeout, which browsers
  // keep running (just throttled) while the tab is hidden — but the PixiJS
  // ticker driving the actual animation is paused solid while hidden (no rAF
  // in a background tab). Net effect: a player who launches, switches tabs
  // for >18s, and comes back finds the sequence force-completed by the
  // watchdog despite the animation having made zero visible progress, which
  // reads as the launch being cancelled out from under them. Fix: only spend
  // the watchdog's budget while the tab is actually visible, banking the
  // remainder across a hide/show cycle instead of letting it run down blind.
  useEffect(() => {
    let remainingMs = LAUNCH_WATCHDOG_MS
    let timer: number | null = null
    let segmentStartedAt = 0

    function startSegment() {
      segmentStartedAt = Date.now()
      timer = window.setTimeout(fireComplete, remainingMs)
    }
    function stopSegment() {
      if (timer === null) return
      window.clearTimeout(timer)
      timer = null
      remainingMs = Math.max(0, remainingMs - (Date.now() - segmentStartedAt))
    }
    function onVisibilityChange() {
      if (document.hidden) stopSegment()
      else startSegment()
    }

    if (!document.hidden) startSegment()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      stopSegment()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
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
        antialias: false,
        autoDensity: true,
        resolution: capDpr(),
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
