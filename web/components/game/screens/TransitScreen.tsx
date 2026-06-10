'use client'

import { useEffect, useState } from 'react'
import type { Target } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'

export default function TransitScreen({ target, onArrive, onBack }: { target: Target; onArrive: () => void; onBack: () => void }) {
  const [progress, setProgress] = useState(12)

  useEffect(() => {
    const timer = window.setInterval(() => setProgress(value => Math.min(100, value + 2)), 100)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (progress === 100) {
      const timer = window.setTimeout(onArrive, 350)
      return () => window.clearTimeout(timer)
    }
  }, [onArrive, progress])

  return (
    <div className="game-screen transit-screen">
      <TopBar eyebrow="MISSION TRANSIT" title={`Outbound · ${target.name}`} onBack={onBack} />
      <div className="transit-stage">
        <div className="target-orb"><span>{target.name}</span></div>
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
        <div><span>Transit</span><strong>{progress}%</strong></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="sticky-actions">
        <PrimaryBtn onClick={onArrive} disabled={progress < 100}>Arrive{progress < 100 ? ` · ${progress}%` : ''}</PrimaryBtn>
      </div>
    </div>
  )
}
