'use client'

import { useEffect, useState } from 'react'
import type { Target } from '@/lib/data'
import { Scene } from '@/lib/engine'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'

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

  // Timed mode: derive progress and ETA from real timestamps
  const [now, setNow] = useState(() => Date.now())

  // Instant (tutorial) mode: fake progress bar
  const [fakeProgress, setFakeProgress] = useState(12)

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
      if (fakeProgress === 100) {
        const timer = window.setTimeout(onArrive, 350)
        return () => window.clearTimeout(timer)
      }
    }
  }, [isTimed, now, arrivalAt, fakeProgress, onArrive])

  // For timed mode we don't know the exact launch time, so track elapsed since mount
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
      <div className="transit-stage">
        <div className="target-orb" data-testid="transit-target"><span>{target.name}</span></div>
        <div className="rocket-mark" data-testid="transit-rocket" style={{ left: `${18 + progress * 0.62}%`, top: `${70 - progress * 0.42}%` }}>
          <svg width="54" height="82" viewBox="0 0 44 70" aria-hidden="true">
            <path d="M22 4 32 18v26H12V18Z" fill="var(--ln-text)" stroke="var(--ln-cyan)" />
            <path d="M22 4 32 18H12Z" fill="var(--ln-cyan)" />
            <path d="m12 36-8 14 8-6m20-8 8 14-8-6" fill="var(--ln-cyan)" />
            <path d="m16 44 6 18 6-18Z" fill="var(--ln-amber)" />
            <path d="M18 62 Q22 72 26 62" fill="none" stroke="var(--ln-amber)" strokeWidth="1.5" opacity="0.7">
              <animate attributeName="d" values="M18 62 Q22 72 26 62;M18 64 Q22 76 26 64;M18 62 Q22 72 26 62" dur="0.3s" repeatCount="indefinite"/>
            </path>
          </svg>
        </div>
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
      <div className="sticky-actions">
        <PrimaryBtn onClick={onArrive} disabled={!arrived}>
          {arrived ? 'Arrive' : isTimed ? `En Route · ${formatEta(etaMs)}` : `Arrive · ${fakeProgress}%`}
        </PrimaryBtn>
        {onAbandon && <GhostBtn onClick={onAbandon}>Abort Mission</GhostBtn>}
      </div>
    </div>
  )
}
