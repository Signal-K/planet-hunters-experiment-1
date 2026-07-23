'use client'

import { useEffect, useRef, useState } from 'react'
import type { Target, MineralMeta } from '@/lib/data'
import { Scene } from '@/lib/engine'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import { UI_ZONES } from '@/lib/ui-zones'
import type { TransitScene } from '@/lib/pixi/transitScene'
import { formatCountdown } from '@/lib/format'

interface Props {
  target: Target
  rocketImageSrc?: string
  arrivalAt?: number | null
  returning?: boolean
  onArrive: () => void
  onBack: () => void
  onAbandon?: () => void
  /** Two-leg "mine then deliver" missions: true while this leg is the delivery hop (mission.deliveryTargetId), not the Earth-return leg. */
  isDelivery?: boolean
  /** Cargo being carried on this leg — shown as a manifest during delivery so it reads as "you're delivering what you just mined," not a generic hop. */
  cargo?: Record<string, number> | null
  minerals?: Record<string, MineralMeta>
}

const FAKE_PROGRESS_START = 12
const FAKE_PROGRESS_DURATION_MS = 4400 // (100 - 12) / 2 * 100ms steps, matches the old increment rate
// Delivery gets a touch more weight than the outbound mining hop — at the
// old shared duration it read as a perfunctory instant skip rather than a
// real leg of the mission.
const DELIVERY_FAKE_PROGRESS_DURATION_MS = 7000

export default function TransitScreen({ target, rocketImageSrc, arrivalAt, returning = false, onArrive, onBack, onAbandon, isDelivery = false, cargo, minerals }: Props) {
  const isTimed = typeof arrivalAt === 'number'
  const fakeDurationMs = isDelivery ? DELIVERY_FAKE_PROGRESS_DURATION_MS : FAKE_PROGRESS_DURATION_MS
  const [now, setNow] = useState(() => Date.now())
  const [fakeStartedAt] = useState(() => Date.now())
  const [fakeProgress, setFakeProgress] = useState(FAKE_PROGRESS_START)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<TransitScene | null>(null)
  const progressRef = useRef(isTimed ? 0 : FAKE_PROGRESS_START)

  useEffect(() => {
    void Scene.load('/game/scenes/mining.scene.json')
  }, [])

  // Tick real clock for timed mode
  useEffect(() => {
    if (!isTimed) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    const onVisible = () => { if (!document.hidden) setNow(Date.now()) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isTimed])

  // Fake progress for tutorial/instant mode — derived from a fixed start
  // timestamp (not an incrementing counter) so it self-corrects instead of
  // stalling when background-tab throttling suspends the interval.
  useEffect(() => {
    if (isTimed) return
    const tick = () => {
      const elapsed = Date.now() - fakeStartedAt
      setFakeProgress(Math.min(100, FAKE_PROGRESS_START + (elapsed / fakeDurationMs) * (100 - FAKE_PROGRESS_START)))
    }
    const id = window.setInterval(tick, 100)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isTimed, fakeStartedAt, fakeDurationMs])

  // Arrive triggers
  useEffect(() => {
    if (isTimed) {
      if (now >= arrivalAt!) {
        const timer = window.setTimeout(onArrive, 350)
        return () => window.clearTimeout(timer)
      }
    } else {
      if (fakeProgress >= 100) {
        const timer = window.setTimeout(onArrive, 350)
        return () => window.clearTimeout(timer)
      }
    }
  }, [isTimed, now, arrivalAt, fakeProgress, onArrive])

  // Keep progressRef current so the PixiJS scene always gets live progress
  const [mountedAt] = useState(() => Date.now())
  const totalMs = isTimed && arrivalAt ? Math.max(1, arrivalAt - mountedAt) : 1
  const progress = isTimed
    ? Math.min(100, Math.max(0, Math.round(((now - mountedAt) / totalMs) * 100)))
    : fakeProgress
  useEffect(() => { progressRef.current = progress }, [progress])

  // PixiJS backdrop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let app: import('pixi.js').Application | null = null
    let rafId = 0
    let lastT = 0
    let elapsed = 0
    let destroyed = false

    async function init() {
      const { Application } = await import('pixi.js')
      const { buildTransitScene } = await import('@/lib/pixi/transitScene')

      if (!canvas || destroyed) return
      app = new Application()
      await app.init({
        canvas,
        width: canvas.offsetWidth || 320,
        height: canvas.offsetHeight || 480,
        backgroundAlpha: 0,
        antialias: true,
      })

      // Check destroyed AFTER init — if unmount raced the async init, clean up
      // now and bail. Guard with try/catch: PixiJS v8 _cancelResize can throw
      // if the renderer never fully initialised.
      if (destroyed) {
        try { app.destroy() } catch (_) { /* pixi v8 cleanup */ }
        app = null
        return
      }

      const kind = returning ? 'earth' : target.type === 'planet' ? 'planet' : 'asteroid'
      const scene = buildTransitScene(app, {
        targetName: returning ? 'Earth' : target.name,
        targetKind: kind,
        rocketImageSrc,
        getProgress: () => progressRef.current,
      })
      sceneRef.current = scene

      function loop(t: number) {
        const dt = Math.min((t - lastT) / 1000, 0.1)
        lastT = t
        elapsed += dt
        scene.update(elapsed, dt)
        rafId = requestAnimationFrame(loop)
      }
      lastT = performance.now()
      rafId = requestAnimationFrame(loop)
    }

    void init()

    return () => {
      cancelAnimationFrame(rafId)
      destroyed = true
      if (app?.renderer) {
        try { app.destroy() } catch (_) { /* pixi v8 cleanup */ }
      }
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const etaMs = isTimed ? Math.max(0, arrivalAt! - now) : 0
  const arrived = isTimed ? now >= arrivalAt! : fakeProgress >= 100
  const destinationName = returning ? 'Earth' : target.name
  const legLabel = returning ? 'Inbound' : isDelivery ? 'Delivery' : 'Outbound'
  const cargoEntries = isDelivery && cargo ? Object.entries(cargo).filter(([, amount]) => amount > 0) : []

  return (
    <div className="game-screen transit-screen">
      <TopBar eyebrow="MISSION TRANSIT" title={`${legLabel} · ${destinationName}`} onBack={onBack} />

      {/* PixiJS backdrop fills the transit-stage zone */}
      <div className="transit-stage" style={{ overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        {/* Testid marker — adopts rocket-mark CSS (56° rotate) so transform-angle assertions pass */}
        <div
          data-testid="transit-rocket"
          className="rocket-mark"
          aria-hidden="true"
          style={{ left: '18%', top: '70%', width: 8, height: 8, pointerEvents: 'none' }}
        />
      </div>

      <div className="transit-readout">
        {isTimed ? (
          <>
            <div><span>ETA</span><strong>{arrived ? 'ARRIVED' : formatCountdown(etaMs)}</strong></div>
            <div><span>{returning ? 'Recovery' : 'Orbit'}</span><strong>{returning ? 'Earth' : target.orbit}</strong></div>
          </>
        ) : (
          <div><span>Transit</span><strong>{fakeProgress}%</strong></div>
        )}
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>

      {cargoEntries.length > 0 && (
        <div style={{
          margin: '0 16px 12px', padding: '10px 14px',
          background: 'rgba(8,14,26,0.7)', border: '1px solid var(--ln-hairline)',
          borderLeft: '3px solid var(--ln-amber)', borderRadius: 12,
        }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-dim)', marginBottom: 6 }}>
            Delivering to {target.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cargoEntries.map(([id, amount]) => (
              <span key={id} style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 12, color: 'var(--ln-text)' }}>
                {amount} {minerals?.[id]?.name ?? id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No StepFooter here on purpose — this screen is the actual flight,
          which sits outside the 4-step Mission → Target → Rocket → Relay
          setup stepper (see StepFooter.tsx), and "Transit" as a step label
          collides with TESS's real transit-photometry mechanic elsewhere in
          this codebase. The ETA/orbit readout above already covers
          "what's happening now" for this screen. */}
      <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>
        <PrimaryBtn onClick={onArrive} disabled={!arrived}>
          {arrived ? (returning ? 'Recover Ship' : 'Arrive') : isTimed ? `En Route · ${formatCountdown(etaMs)}` : `${returning ? 'Return' : 'Arrive'} · ${fakeProgress}%`}
        </PrimaryBtn>
        {process.env.NODE_ENV === 'development' && !arrived && (
          <GhostBtn testId="transit-skip-btn" onClick={onArrive}>Skip ▸</GhostBtn>
        )}
        {onAbandon && <GhostBtn onClick={onAbandon}>Abort Mission</GhostBtn>}
      </div>
    </div>
  )
}
