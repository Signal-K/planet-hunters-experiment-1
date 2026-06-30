'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { Mission, Target, MineralMeta } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
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

// Horizontal drag track — left = slow, center = normal, right = fast forward
// Thumb snaps back to center on release
function ScrollTrack({ scrollRef }: { scrollRef: React.MutableRefObject<((dx: number) => void) | null> }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(0.5)   // 0..1, 0.5 = center = normal speed
  const [active, setActive] = useState(false)

  const applyAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setPos(p)
    scrollRef.current?.(p * 2 - 1)  // maps 0..1 → -1..1
  }

  const release = () => {
    setActive(false)
    setPos(0.5)
    scrollRef.current?.(0)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800,
        letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        SCROLL
      </div>
      <div
        ref={trackRef}
        style={{
          position: 'relative', flex: 1, height: 36, borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${active ? 'rgba(100,180,255,0.4)' : 'rgba(100,180,255,0.15)'}`,
          cursor: 'pointer', touchAction: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 120ms',
        }}
        onPointerDown={e => {
          setActive(true)
          e.currentTarget.setPointerCapture(e.pointerId)
          applyAt(e.clientX)
        }}
        onPointerMove={e => { if (active) applyAt(e.clientX) }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {/* End labels */}
        <span style={{ position: 'absolute', left: 6, fontSize: 9, color: 'rgba(135,207,250,0.35)', lineHeight: 1 }}>◀</span>
        <span style={{ position: 'absolute', right: 6, fontSize: 9, color: 'rgba(135,207,250,0.35)', lineHeight: 1 }}>▶</span>
        {/* Center tick */}
        <div style={{ position: 'absolute', top: '30%', bottom: '30%', left: '50%', width: 1, background: 'rgba(255,255,255,0.1)' }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute',
          left: `calc(${pos * 100}% - 10px)`,
          width: 20, height: 20, borderRadius: '50%',
          background: active ? 'rgba(63,169,255,0.85)' : 'rgba(135,207,250,0.25)',
          border: `1.5px solid ${active ? 'rgba(135,207,250,0.8)' : 'rgba(135,207,250,0.4)'}`,
          boxShadow: active ? '0 0 10px rgba(63,169,255,0.5)' : 'none',
          transition: active ? 'background 80ms, border-color 80ms, box-shadow 80ms' : 'left 180ms ease-out, background 120ms, border-color 120ms, box-shadow 120ms',
        }} />
      </div>
    </div>
  )
}

const MINING_GUIDE = [
  { label: 'FIRE LASER', desc: 'Fires your mining laser at the asteroid. Collect ore by hitting ore veins (Space/F).' },
  { label: 'SCROLL', desc: 'Drag the scroll track left to slow down, right to fast-forward camera movement.' },
  { label: 'INVENTORY', desc: 'Shows collected vs. required per mineral. Fill all slots to unlock return.' },
  { label: 'RETURN HOME', desc: 'Return to base. Only enabled once your cargo meets the mission order.' },
]

export default function MiningScreen({ mission, target, onComplete, onBack, minerals, laserChargeCap, hasCoach, coachManual, onCoachDone }: {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  onBack: () => void
  minerals: Record<string, MineralMeta>
  laserChargeCap?: number
  hasCoach?: boolean
  coachManual?: boolean
  onCoachDone?: () => void
}) {
  const MAX_CHARGES = Math.max(1, laserChargeCap ?? 5)
  const cargoRef = useRef<Record<string, number>>({})
  const [cargo, setCargo] = useState<Record<string, number>>({})
  const fireRef = useRef<(() => void) | null>(null)
  const scrollRef = useRef<((dx: number) => void) | null>(null)
  const [laserCharges, setLaserCharges] = useState(MAX_CHARGES)
  const [runKey, setRunKey] = useState(0)  // bump to reset MiningCanvas
  const firedRef = useRef(false)
  const oreNearRef = useRef<((near: boolean) => void) | null>(null)
  const [oreNear, setOreNear] = useState(false)
  oreNearRef.current = (near: boolean) => setOreNear(near)

  // During onboarding, depleted charges without filling the order = tutorial fail
  const tutorialFailed = hasCoach && laserCharges === 0 && !Object.entries(mission.requires.minerals).every(
    ([id, amount]) => (cargoRef.current[id] ?? 0) >= amount
  )

  function handleTryAgain() {
    cargoRef.current = {}
    setCargo({})
    setLaserCharges(MAX_CHARGES)
    firedRef.current = false
    setRunKey(k => k + 1)
  }

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
    if (!firedRef.current && coachManual) {
      firedRef.current = true
      onCoachDone?.()
    }
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

      {hasCoach && <div style={{ height: coachManual ? 248 : 152, flexShrink: 0 }} />}

      {/* Onboarding fail overlay — only shown during tutorial when charges are depleted without filling order */}
      {tutorialFailed && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(3,6,12,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-crit)', textTransform: 'uppercase' }}>Laser Depleted</div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800, color: '#e6efff', textAlign: 'center', lineHeight: 1.2 }}>Order Not Filled</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#a9b8ce', textAlign: 'center', lineHeight: 1.5 }}>Fire your laser at ore deposits — aim carefully so each shot lands. Try again to restart the mining run.</div>
          <button onClick={handleTryAgain} style={{ marginTop: 8, padding: '14px 32px', background: 'var(--ln-cyan)', border: 'none', borderRadius: 10, fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', color: '#000', cursor: 'pointer', textTransform: 'uppercase' }}>
            Try Again
          </button>
        </div>
      )}

      <div className="mining-viewport">
        <div className="mining-stars" />
        <MiningCanvas
          key={runKey}
          minerals={Object.keys(mission.requires.minerals)}
          mineralMeta={minerals}
          onCollect={collectMineral}
          fireRef={fireRef}
          scrollRef={scrollRef}
          oreNearRef={oreNearRef}
        />
      </div>

      <div className="mining-controls">
        {/* ── Stats + charge strip ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 28 }}>
          {/* Mineral counts */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            {Object.entries(mission.requires.minerals).map(([id, amount]) => {
              const collected = Math.min(cargo[id] ?? 0, amount)
              const done = collected >= amount
              const color = minerals[id]?.color ?? '#fff'
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <OreShapeIcon id={id} color={done ? 'var(--ln-text-muted)' : color} size={11} />
                  <span style={{
                    fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: done ? 'var(--ln-text-muted)' : color,
                  }}>
                    {minerals[id]?.name ?? id}
                  </span>
                  <span style={{
                    fontFamily: 'var(--ln-font-mono)', fontSize: 10,
                    color: done ? 'var(--ln-text-muted)' : 'var(--ln-text)',
                  }}>
                    {collected}/{amount}
                  </span>
                </div>
              )
            })}
          </div>
          {/* Total */}
          <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-cyan-bright)', flexShrink: 0 }}>
            {totalCollected}/{totalNeeded}
          </span>
          {/* Charge dots */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
            {Array.from({ length: MAX_CHARGES }, (_, i) => (
              <span key={i} style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                background: i < laserCharges ? 'var(--ln-cyan)' : 'rgba(255,255,255,0.1)',
                boxShadow: i < laserCharges ? '0 0 4px var(--ln-cyan)' : 'none',
                transition: 'background 200ms, box-shadow 200ms',
              }} />
            ))}
          </div>
          {/* Guide */}
          <button
            data-testid="mining-guide-btn"
            onClick={() => setGuideOpen(o => !o)}
            style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(8,12,22,0.7)', border: '1px solid rgba(100,180,255,0.28)', fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#87CFFA', cursor: 'pointer', textTransform: 'uppercase', flexShrink: 0 }}
          >
            ?
          </button>
        </div>

        {/* Progress bar */}
        <div className="mining-progress-track">
          <div
            className="mining-progress-fill"
            style={{ width: `${Math.min(100, (totalCollected / totalNeeded) * 100)}%` }}
          />
        </div>

        {/* ── Action row: Fire · Fill/Return · Scroll ───────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 88px', gap: 8, alignItems: 'stretch' }}>
          <div style={{
            borderRadius: 10,
            boxShadow: hasCoach && oreNear
              ? '0 0 0 2px rgba(63,169,255,0.7), 0 0 18px rgba(63,169,255,0.35)'
              : 'none',
            animation: hasCoach && oreNear ? 'ln-pulse 0.75s ease-in-out infinite' : 'none',
            transition: 'box-shadow 150ms',
          }}>
          <PrimaryBtn
            kind="cyan"
            disabled={laserCharges <= 0}
            testId="fire-laser-btn"
            onClick={fireLaser}
          >
            {laserCharges > 0 ? 'FIRE LASER' : 'DEPLETED'}
          </PrimaryBtn>
          </div>
          <PrimaryBtn
            kind="amber"
            disabled={!orderFilled && laserCharges > 0}
            testId="return-home-btn"
            onClick={handleReturn}
          >
            {orderFilled ? 'RETURN' : laserCharges <= 0 ? 'RETURN' : 'FILL ORDER'}
          </PrimaryBtn>
          <ScrollTrack scrollRef={scrollRef} />
        </div>
      </div>
    </div>
  )
}
