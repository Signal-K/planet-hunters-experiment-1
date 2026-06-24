'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
import type { Mission, Target } from '@/lib/data'
import { MINERAL_META } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'

const ROVER_MINING_DURATION_MS = 2 * 60 * 1000

function generateRoverCargo(target: Target): Record<string, number> {
  const cargo: Record<string, number> = {}
  const minerals = target.minerals.slice(0, 3)
  minerals.forEach((mineral, i) => {
    cargo[mineral] = 2 + i
  })
  return cargo
}

interface RoverMiningScreenProps {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  onBack: () => void
}

export default function RoverMiningScreen({ mission, target, onComplete, onBack }: RoverMiningScreenProps) {
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  const elapsed = now - startedAt
  const done = elapsed >= ROVER_MINING_DURATION_MS
  const progressPct = Math.min(100, (elapsed / ROVER_MINING_DURATION_MS) * 100)
  const remaining = Math.max(0, ROVER_MINING_DURATION_MS - elapsed)
  const cargo = generateRoverCargo(target)

  const totalSec = Math.ceil(remaining / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const countdown = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`

  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [done])

  return (
    <div className="game-screen">
      <TopBar eyebrow={`SURFACE OPS · ${target.name.toUpperCase()}`} title="Rover Mining" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>

        <Panel accent={done ? 'var(--ln-ok)' : 'var(--ln-amber)'} style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <RoverIcon done={done} />
            <div>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: done ? 'var(--ln-ok)' : 'var(--ln-amber)' }}>
                {done ? 'EXTRACTION COMPLETE' : 'EXTRACTING DEPOSITS'}
              </div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 2 }}>
                {mission.title}
              </div>
            </div>
          </div>
          {!done && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#6b7fa3' }}>OPERATION PROGRESS</span>
                <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--ln-amber)' }}>{countdown}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(245,166,35,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--ln-amber)', borderRadius: 3, transition: 'width 1s linear' }} />
              </div>
            </>
          )}
        </Panel>

        <Panel style={{ padding: 12, marginTop: 10 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#6b7fa3', textTransform: 'uppercase', marginBottom: 8 }}>
            PROJECTED YIELD
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(cargo).map(([mineral, amount]) => {
              const meta = MINERAL_META[mineral]
              return (
                <div key={mineral} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, background: (meta?.color ?? '#888') + '22', border: `1px solid ${meta?.color ?? '#888'}55`, fontFamily: 'var(--ln-font-mono)', fontSize: 11, fontWeight: 700, color: meta?.color ?? '#888' }}>
                    {meta?.sym ?? mineral.slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, fontFamily: 'var(--ln-font-display)', fontSize: 13, color: '#e8f0fe' }}>
                    {meta?.name ?? mineral}
                  </span>
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 13, fontWeight: 700, color: '#6b7fa3' }}>
                    ×{amount}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: '#6b7fa3', fontFamily: 'var(--ln-font-body)' }}>
            Starter rover. Works on any target type — no gravity or pressure restrictions.
          </div>
        </Panel>

        {done && (
          <div style={{ marginTop: 12 }}>
            <StatusPill kind="ok">ROVER RETURNED — MINERALS SECURED</StatusPill>
            <div style={{ marginTop: 10 }}>
              <PrimaryBtn kind="green" onClick={() => onComplete(cargo)}>
                COLLECT CARGO
              </PrimaryBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RoverIcon({ done }: { done: boolean }) {
  const color = done ? 'var(--ln-ok)' : 'var(--ln-amber)'
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="8" y="12" width="16" height="10" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M8 17h16M13 12V9m6 3V9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="24" r="2.5" stroke={color} strokeWidth="1.5" />
      <circle cx="22" cy="24" r="2.5" stroke={color} strokeWidth="1.5" />
      {done && <path d="M13 16l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}
