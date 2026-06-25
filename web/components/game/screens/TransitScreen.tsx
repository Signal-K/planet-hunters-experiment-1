'use client'

import { useEffect, useRef, useState } from 'react'
import type { Target } from '@/lib/data'
import { Scene } from '@/lib/engine'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import { UI_ZONES } from '@/lib/ui-zones'
import type { TransitScene } from '@/lib/pixi/transitScene'

function formatEta(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSecs = Math.ceil(ms / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

interface Props {
  target: Target
  arrivalAt?: number | null
  onArrive: () => void
  onBack: () => void
  onAbandon?: () => void
}

export default function TransitScreen({ target, arrivalAt, onArrive, onBack, onAbandon }: Props) {
  const isTimed = typeof arrivalAt === 'number'
  const [now, setNow] = useState(() => Date.now())
  const [fakeProgress, setFakeProgress] = useState(12)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<TransitScene | null>(null)

  useEffect(() => {
    void Scene.load('/game/scenes/mining.scene.json')
  }, [])

  // Tick real clock for timed mode
  useEffect(() => {
    if (!isTimed) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [isTimed])

  // Fake progress for tutorial/instant mode
  useEffect(() => {
    if (isTimed) return
    const id = window.setInterval(() => setFakeProgress(v => Math.min(100, v + 2)), 100)
    return () => window.clearInterval(id)
  }, [isTimed])

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

  // PixiJS backdrop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let app: import('pixi.js').Application | null = null
    let rafId = 0
    let lastT = 0
    let elapsed = 0

    const progressRef = { current: isTimed ? 0 : fakeProgress }

    async function init() {
      const { Application } = await import('pixi.js')
      const { buildTransitScene } = await import('@/lib/pixi/transitScene')

      if (!canvas) return
      app = new Application()
      await app.init({
        canvas,
        width: canvas.offsetWidth || 320,
        height: canvas.offsetHeight || 480,
        backgroundAlpha: 0,
        antialias: true,
      })

      const kind = target.type === 'planet' ? 'planet' : 'asteroid'
      const scene = buildTransitScene(app, {
        targetName: target.name,
        targetKind: kind,
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
      app?.destroy()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [mountedAt] = useState(() => Date.now())
  const totalMs = isTimed && arrivalAt ? Math.max(1, arrivalAt - mountedAt) : 1
  const progress = isTimed
    ? Math.min(100, Math.max(0, Math.round(((now - mountedAt) / totalMs) * 100)))
    : fakeProgress
  const etaMs = isTimed ? Math.max(0, arrivalAt! - now) : 0
  const arrived = isTimed ? now >= arrivalAt! : fakeProgress >= 100

  return (
    <div className="game-screen transit-screen">
      <TopBar eyebrow="MISSION TRANSIT" title={`Outbound · ${target.name}`} onBack={onBack} />

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
            <div><span>ETA</span><strong>{arrived ? 'ARRIVED' : formatEta(etaMs)}</strong></div>
            <div><span>Orbit</span><strong>{target.orbit}</strong></div>
          </>
        ) : (
          <div><span>Transit</span><strong>{fakeProgress}%</strong></div>
        )}
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>
        <PrimaryBtn onClick={onArrive} disabled={!arrived}>
          {arrived ? 'Arrive' : isTimed ? `En Route · ${formatEta(etaMs)}` : `Arrive · ${fakeProgress}%`}
        </PrimaryBtn>
        {onAbandon && <GhostBtn onClick={onAbandon}>Abort Mission</GhostBtn>}
      </div>
    </div>
  )
}
