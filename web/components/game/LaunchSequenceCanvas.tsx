'use client'

import { useEffect, useRef } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application } from 'pixi.js'
import { buildLaunchScene, LAUNCH_W, LAUNCH_H } from '@/lib/pixi/launchScene'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import SequenceDesktopFrame from '@/components/game/SequenceDesktopFrame'

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
  // The stage resizes when the desktop frame kicks in; rebuild the scene then so it lays out at the real size.
  const isDesktop = useIsDesktop()

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
    let devWorker: Worker | null = null
    let devWorkerUrl: string | null = null

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

      const runFrame = (deltaFrames: number) => {
        elapsed += deltaFrames / 60
        // SSL-281: a thrown error from inside scene.update() previously took
        // the whole PixiJS ticker down with it (an exception on one frame
        // stops the rAF loop from ever being rescheduled), leaving the
        // rocket frozen mid-sequence with no visible error and no recovery —
        // reads exactly like "the rocket wasn't moving". Isolate each frame
        // so one bad frame can't permanently stall the animation; fall back
        // to completing the sequence if updates keep failing.
        try {
          scene.update(elapsed, deltaFrames / 60)
        } catch (err) {
          console.error('[LaunchSequenceCanvas] scene.update failed, ending sequence', err)
          fireComplete()
        }
      }

      if (process.env.NODE_ENV === 'development') {
        // PixiJS's ticker runs on requestAnimationFrame, which Chrome throttles
        // to a full stop whenever it considers the tab hidden/occluded — a
        // state that's not limited to real tab-switching (an OS-level occluded
        // or automation-driven window reports document.hidden=true too, with
        // no way for app code to detect or opt out of it). A plain
        // setInterval on the main thread doesn't escape this either — Chrome
        // throttles ALL main-thread timers in a backgrounded tab to ~1/sec.
        // A dedicated Worker's timers aren't subject to that page-visibility
        // throttling, so drive the tick from one and just react to it here.
        app.ticker.stop()
        const workerSrc = `let id=null; onmessage=(e)=>{ if(e.data==='start') id=setInterval(()=>postMessage(1), ${1000 / 60}); else if(e.data==='stop'){ clearInterval(id); id=null } };`
        devWorkerUrl = URL.createObjectURL(new Blob([workerSrc], { type: 'application/javascript' }))
        devWorker = new Worker(devWorkerUrl)
        devWorker.onmessage = () => {
          runFrame(1)
          // The ticker normally drives PixiJS's own render call too — stopping
          // it to escape rAF throttling means we must also trigger the draw
          // ourselves, or scene.update() runs with nothing ever painted.
          app.renderer.render(app.stage)
        }
        devWorker.postMessage('start')
      } else {
        app.ticker.add(t => runFrame(t.deltaTime))
      }
    })()

    return () => {
      destroyed = true
      if (devWorker) {
        devWorker.postMessage('stop')
        devWorker.terminate()
      }
      if (devWorkerUrl) URL.revokeObjectURL(devWorkerUrl)
      if (initialized) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
        canvas.remove()
      }
    }
  }, [rocketImageSrc, rocketName, targetName, isDesktop])

  return (
    <SequenceDesktopFrame
      background="#000"
      stageAspect={`${LAUNCH_W} / ${LAUNCH_H}`}
      leftTitle="MISSION"
      leftRows={[
        { label: 'VEHICLE', value: rocketName },
        { label: 'DESTINATION', value: targetName },
      ]}
      rightTitle="LAUNCH TELEMETRY"
      rightRows={[
        { label: 'SEQUENCE', value: 'AUTOMATED' },
        { label: 'STATUS', value: 'NOMINAL' },
      ]}
      showClock
      renderStage={style => <div ref={divRef} data-testid="launch-sequence-stage" style={{ background: '#000', ...style }} />}
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
    </SequenceDesktopFrame>
  )
}
