'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { POINTING_OPTIONS, type InstrumentPointing } from '@/lib/research/paths'
import styles from './SkyPointing.module.css'

/** Sky is a 160 x 90 plane. Each sector is where one instrument kind listens. */
const W = 160
const H = 90
const SECTOR_RADIUS = 13
const SECTORS: Record<InstrumentPointing, { x: number; y: number; name: string }> = {
  transit: { x: 38, y: 30, name: 'Star field' },
  'deep-space': { x: 84, y: 58, name: 'Ecliptic' },
  saturn: { x: 128, y: 26, name: 'Saturn' },
}
const DISH = { x: 80, y: 86 }
const SPEED = 46 // sky units per second at full stick

interface Props {
  /** The sector already locked this week, if any. */
  locked?: InstrumentPointing | null
  onLock: (pointing: InstrumentPointing) => void
  onCancel: () => void
}

/** Deterministic star field so the sky does not reshuffle on every render. */
function stars(): { x: number; y: number; r: number; o: number }[] {
  let seed = 7
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  return Array.from({ length: 90 }, () => ({ x: rand() * W, y: rand() * H, r: 0.2 + rand() * 0.5, o: 0.3 + rand() * 0.7 }))
}

function sectorAt(x: number, y: number): InstrumentPointing | null {
  let best: InstrumentPointing | null = null
  let bestD = SECTOR_RADIUS
  for (const id of Object.keys(SECTORS) as InstrumentPointing[]) {
    const d = Math.hypot(SECTORS[id].x - x, SECTORS[id].y - y)
    if (d < bestD) { best = id; bestD = d }
  }
  return best
}

/**
 * The weekly pointing step: aim the instruments at part of the night sky with a joystick, lock on,
 * and watch the signal come in. Signals then arrive through the week.
 */
export default function SkyPointing({ locked = null, onLock, onCancel }: Props) {
  const [pos, setPos] = useState({ x: locked ? SECTORS[locked].x : W / 2, y: locked ? SECTORS[locked].y : H / 2 })
  const [confirmed, setConfirmed] = useState<InstrumentPointing | null>(locked)
  const stick = useRef({ x: 0, y: 0 })
  const keys = useRef({ x: 0, y: 0 })
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const field = useMemo(stars, [])
  const over = sectorAt(pos.x, pos.y)

  useEffect(() => {
    if (confirmed) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const vx = stick.current.x + keys.current.x
      const vy = stick.current.y + keys.current.y
      if (vx || vy) {
        setPos(p => ({
          x: Math.max(2, Math.min(W - 2, p.x + vx * SPEED * dt)),
          y: Math.max(2, Math.min(H - 8, p.y + vy * SPEED * dt)),
        }))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [confirmed])

  useEffect(() => {
    const onKey = (down: boolean) => (event: KeyboardEvent) => {
      const v = down ? 1 : 0
      if (event.key === 'ArrowLeft') keys.current.x = -v
      else if (event.key === 'ArrowRight') keys.current.x = v
      else if (event.key === 'ArrowUp') keys.current.y = -v
      else if (event.key === 'ArrowDown') keys.current.y = v
      else return
      event.preventDefault()
    }
    const dn = onKey(true)
    const up = onKey(false)
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  const moveStick = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const radius = rect.width / 2
    let dx = event.clientX - (rect.left + radius)
    let dy = event.clientY - (rect.top + radius)
    const len = Math.hypot(dx, dy)
    if (len > radius) { dx = (dx / len) * radius; dy = (dy / len) * radius }
    stick.current = { x: dx / radius, y: dy / radius }
    setKnob({ x: dx, y: dy })
  }, [])
  const releaseStick = useCallback(() => { stick.current = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }) }, [])

  const target = confirmed ? SECTORS[confirmed] : null
  const label = (id: InstrumentPointing) => POINTING_OPTIONS.find(option => option.id === id)

  return (
    <div className={styles.root} data-testid="sky-pointing" role="dialog" aria-label="Point your instruments">
      <button type="button" className={styles.close} data-testid="sky-pointing-back" onClick={onCancel}>BACK</button>
      <div className={styles.sky}>
        <div className={styles.plane}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className={styles.svg} aria-hidden="true">
          <defs>
            <radialGradient id="sky-glow" cx="50%" cy="100%" r="90%">
              <stop offset="0%" stopColor="#1d3a63" />
              <stop offset="100%" stopColor="#050a18" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#sky-glow)" />
          {field.map((star, i) => <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.o} />)}
          <path d={`M0 70 Q ${W / 2} 36 ${W} 70`} className={styles.ecliptic} />
          {(Object.keys(SECTORS) as InstrumentPointing[]).map(id => {
            const s = SECTORS[id]
            const active = (confirmed ?? over) === id
            return (
              <g key={id} data-testid={`sky-sector-${id}`} data-active={active}>
                <circle cx={s.x} cy={s.y} r={SECTOR_RADIUS} className={styles.sector} data-active={active} />
              </g>
            )
          })}
          {/* The dish: the instrument array on the ground. */}
          <path d={`M${DISH.x - 7} ${DISH.y} Q ${DISH.x} ${DISH.y - 9} ${DISH.x + 7} ${DISH.y} Z`} className={styles.dish} />
          {target && (
            <g data-testid="sky-signal">
              {[0, 1, 2].map(i => (
                <circle key={i} cx={DISH.x} cy={DISH.y - 3} r={4} className={styles.ring} style={{ animationDelay: `${i * 0.9}s` }} />
              ))}
              <line x1={DISH.x} y1={DISH.y - 4} x2={target.x} y2={target.y} className={styles.beam} />
              {[0, 1, 2, 3].map(i => (
                <circle key={i} r={0.9} className={styles.packet} style={{ offsetPath: `path('M${target.x} ${target.y} L ${DISH.x} ${DISH.y - 4}')`, animationDelay: `${i * 0.7}s` }} />
              ))}
            </g>
          )}
          {!confirmed && (
            <g transform={`translate(${pos.x} ${pos.y})`} data-testid="sky-reticle">
              <circle r="4.2" className={styles.reticle} />
              <path d="M-7 0H-2.5M2.5 0H7M0 -7V-2.5M0 2.5V7" className={styles.reticle} />
            </g>
          )}
        </svg>
        {(Object.keys(SECTORS) as InstrumentPointing[]).map(id => (
          <span key={id} className={styles.sectorName} data-active={(confirmed ?? over) === id} style={{ left: `${(SECTORS[id].x / W) * 100}%`, top: `${((SECTORS[id].y + SECTOR_RADIUS) / H) * 100}%` }}>{SECTORS[id].name}</span>
        ))}
        </div>
      </div>

      <div className={styles.panel}>
        <p className={styles.kicker}>Point your instruments</p>
        {confirmed ? (
          <>
            <h2 className={styles.title} data-testid="sky-pointing-title">Locked on {label(confirmed)?.label.toLowerCase()}</h2>
            <p className={styles.copy}>Your array is listening. Signals come in over the week, and anything unusual lands in your Control Station.</p>
            <button type="button" className={styles.primary} data-testid="sky-pointing-done" onClick={() => onLock(confirmed)}>SIGNALS INCOMING · CONTINUE</button>
          </>
        ) : (
          <>
            <h2 className={styles.title} data-testid="sky-pointing-title">{over ? SECTORS[over].name : 'Scanning the sky'}</h2>
            <p className={styles.copy}>{over ? label(over)?.note : 'Steer the sight with the stick until a patch of sky lights up.'}</p>
            <button type="button" className={styles.primary} data-testid="sky-pointing-lock" disabled={!over} onClick={() => over && setConfirmed(over)}>
              {over ? 'POINT HERE' : 'FIND A SECTOR'}
            </button>
          </>
        )}
      </div>

      {!confirmed && (
        <div
          className={styles.stick}
          data-testid="sky-stick"
          role="application"
          aria-label="Joystick: steer the sight across the sky"
          onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); moveStick(event) }}
          onPointerMove={event => { if (event.buttons) moveStick(event) }}
          onPointerUp={releaseStick}
          onPointerCancel={releaseStick}
        >
          <div className={styles.knob} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
        </div>
      )}
    </div>
  )
}
