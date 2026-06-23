'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { Mission, Target, MineralMeta } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import MiningCanvas from './MiningCanvas'

const ORE_SHAPES: Record<string, 'circle' | 'diamond' | 'rect' | 'triangle'> = {
  iron: 'circle', silicon: 'diamond', ice: 'circle',
  carbon: 'rect', nickel: 'diamond', cobalt: 'triangle',
  gold: 'circle', rare: 'diamond',
}

function OreShapeIcon({ id, color, size = 14 }: { id: string; color: string; size?: number }) {
  const shape = ORE_SHAPES[id] ?? 'circle'
  if (shape === 'diamond')
    return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><polygon points="7,1 13,7 7,13 1,7" fill={color} /></svg>
  if (shape === 'rect')
    return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="3" width="10" height="8" rx="1" fill={color} /></svg>
  if (shape === 'triangle')
    return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><polygon points="7,1 13,13 1,13" fill={color} /></svg>
  return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill={color} /></svg>
}

const MINING_GUIDE = [
  { label: 'FIRE LASER', desc: 'Fires your mining laser at the asteroid. Collect ore by hitting ore veins (Space/F).' },
  { label: 'DRONE STATUS', desc: 'Your automated drone helps stabilize the craft and collects nearby floating debris.' },
  { label: 'INVENTORY', desc: 'Shows collected vs. required per mineral. Fill all slots to unlock return.' },
  { label: 'MISSION GOALS', desc: 'Combined ore progress and value context for the current contract.' },
  { label: 'RETURN HOME', desc: 'Return to base. Only enabled once your cargo meets the mission order.' },
]

export default function MiningScreen({ mission, target, onComplete, onBack, minerals, laserChargeCap }: {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  onBack: () => void
  minerals: Record<string, MineralMeta>
  laserChargeCap?: number
}) {
  const MAX_CHARGES = Math.max(1, laserChargeCap ?? 5)
  const cargoRef = useRef<Record<string, number>>({})
  const [cargo, setCargo] = useState<Record<string, number>>({})
  const fireRef = useRef<(() => void) | null>(null)
  const [laserCharges, setLaserCharges] = useState(MAX_CHARGES)

  const orderFilled = Object.entries(mission.requires.minerals).every(
    ([id, amount]) => (cargoRef.current[id] ?? 0) >= amount
  )

  const collectMineral = useCallback((mineral: string) => {
    cargoRef.current = {
      ...cargoRef.current,
      [mineral]: (cargoRef.current[mineral] ?? 0) + 1,
    }
    setCargo(cargoRef.current)
  }, [])

  function fireLaser() {
    if (laserCharges <= 0) return
    setLaserCharges(c => c - 1)
    fireRef.current?.()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'KeyF') {
        e.preventDefault()
        fireLaser()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laserCharges])

  function handleReturn() {
    if (orderFilled || laserCharges <= 0) onComplete(cargoRef.current)
  }

  const totalNeeded = Object.entries(mission.requires.minerals).reduce((sum, [, v]) => sum + v, 0)
  const totalCollected = Object.entries(mission.requires.minerals).reduce(
    (sum, [id, amount]) => sum + Math.min(cargo[id] ?? 0, amount), 0
  )
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="game-screen mining-screen">
      <TopBar eyebrow={`${target.name.toUpperCase()} · SURFACE`} title="Mining Run" onBack={onBack} />

      {guideOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(3,6,12,0.82)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 16, gap: 8 }} onClick={() => setGuideOpen(false)}>
          <div style={{ background: 'rgba(8,16,30,0.97)', border: '1px solid rgba(100,180,255,0.3)', borderRadius: 14, padding: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: '#87CFFA', textTransform: 'uppercase', marginBottom: 10 }}>Mining Controls</div>
            {MINING_GUIDE.map(item => (
              <div key={item.label} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#f5a623', whiteSpace: 'nowrap', minWidth: 90 }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', lineHeight: 1.4 }}>{item.desc}</span>
              </div>
            ))}
            <button onClick={() => setGuideOpen(false)} style={{ marginTop: 4, width: '100%', padding: '8px 0', background: 'rgba(100,180,255,0.1)', border: '1px solid rgba(100,180,255,0.3)', borderRadius: 8, fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#87CFFA', cursor: 'pointer', textTransform: 'uppercase' }}>Close</button>
          </div>
        </div>
      )}

      <div style={{ height: 148, flexShrink: 0 }} />

      <div className="mining-viewport">
        <div className="mining-stars" />

        <MiningCanvas
          minerals={Object.keys(mission.requires.minerals)}
          mineralMeta={minerals}
          onCollect={collectMineral}
          fireRef={fireRef}
        />
      </div>

      <div className="mining-controls">
        <Panel accent="var(--ln-amber)" variant="compact">
          <div className="mining-stats-row">
            {Object.entries(mission.requires.minerals).map(([id, amount]) => {
              const collected = Math.min(cargo[id] ?? 0, amount)
              const done = collected >= amount
              const color = minerals[id]?.color ?? '#fff'
              return (
                <div className="mineral-stat" key={id} style={{ gap: 5 }}>
                  <OreShapeIcon id={id} color={done ? 'var(--ln-text-muted)' : color} size={13} />
                  <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: done ? 'var(--ln-text-muted)' : color, textTransform: 'uppercase' }}>
                    {minerals[id]?.name ?? id}
                  </span>
                  <span className="mineral-stat-count" style={{ color: done ? 'var(--ln-text-muted)' : 'var(--ln-text)' }}>
                    {collected}/{amount}
                  </span>
                </div>
              )
            })}
            <div className="mineral-stat total-stat">
              <span>Total</span>
              <span>{totalCollected}/{totalNeeded}</span>
            </div>
          </div>
          <div className="mining-progress-track">
            <div
              className="mining-progress-fill"
              style={{ width: `${Math.min(100, (totalCollected / totalNeeded) * 100)}%` }}
            />
          </div>
        </Panel>

        <div className="mining-actions">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px' }}>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
              Laser Energy
            </span>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {Array.from({ length: MAX_CHARGES }, (_, i) => (
                <span key={i} style={{
                  display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                  background: i < laserCharges ? 'var(--ln-cyan)' : 'rgba(255,255,255,0.1)',
                  boxShadow: i < laserCharges ? '0 0 6px var(--ln-cyan)' : 'none',
                  transition: 'background 200ms, box-shadow 200ms',
                }} />
              ))}
              <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: laserCharges > 0 ? 'var(--ln-cyan-bright)' : 'var(--ln-text-muted)', marginLeft: 4, minWidth: 24, textAlign: 'right' }}>
                {laserCharges}/{MAX_CHARGES}
              </span>
            </span>
          </div>
          <PrimaryBtn
            kind="cyan"
            disabled={laserCharges <= 0}
            testId="fire-laser-btn"
            onClick={fireLaser}
          >
            {laserCharges > 0 ? 'FIRE LASER' : 'DEPLETED'}
          </PrimaryBtn>
          <PrimaryBtn
            kind="amber"
            disabled={!orderFilled && laserCharges > 0}
            testId="return-home-btn"
            onClick={handleReturn}
          >
            {orderFilled ? 'RETURN HOME' : laserCharges <= 0 ? 'LASER DEPLETED · RETURN' : 'FILL ORDER TO RETURN'}
          </PrimaryBtn>
          <button
            data-testid="mining-guide-btn"
            onClick={() => setGuideOpen(o => !o)}
            style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(8,12,22,0.7)', border: '1px solid rgba(100,180,255,0.35)', fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#87CFFA', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            ? Guide
          </button>
        </div>
      </div>
    </div>
  )
}
