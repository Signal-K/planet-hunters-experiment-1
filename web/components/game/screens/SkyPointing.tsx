'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InstrumentPointing } from '@/lib/research/paths'
import styles from './SkyPointing.module.css'

/** Every view is a 160 x 90 plane. */
const W = 160
const H = 90
const SPEED = 46 // view units per second at full stick

interface Target { id: string; name: string; note: string; x: number; y: number; r: number }
type Sight = 'frame' | 'crosshair' | 'zoom'

interface Instrument {
  short: string
  name: string
  station: string
  blurb: string
  sight: Sight
  targets: Target[]
  lockedCopy: (target: Target) => string
}

/** Three instruments, three different ways of looking: each has its own view, sight and lock-on. */
const INSTRUMENTS: Record<InstrumentPointing, Instrument> = {
  transit: {
    short: 'Space telescope',
    name: 'Space telescope',
    station: 'In orbit around Earth',
    blurb: 'A wide-field camera above the air. Slew it to a patch of stars and stare: planets show up as tiny dips in starlight.',
    sight: 'frame',
    targets: [
      { id: 'north', name: 'Northern field', note: 'A dense patch of stars. Many will have planets.', x: 34, y: 24, r: 15 },
      { id: 'plane', name: 'Galactic plane', note: 'The Milky Way crowds the frame with stars.', x: 84, y: 34, r: 15 },
      { id: 'south', name: 'Southern field', note: 'A quiet field of bright, nearby stars.', x: 128, y: 22, r: 15 },
    ],
    lockedCopy: t => `The telescope is staring at the ${t.name.toLowerCase()}. Starlight is measured nonstop; dips arrive in your Control Station through the week.`,
  },
  'deep-space': {
    short: 'Ground telescope',
    name: 'Ground telescope',
    station: 'On the ground · dome open',
    blurb: 'A dome on the hill. Swing the slit along the ecliptic, where asteroids drift past the stars.',
    sight: 'crosshair',
    targets: [
      { id: 'evening', name: 'Evening sky', note: 'Low in the west after sunset.', x: 36, y: 55, r: 14 },
      { id: 'opposition', name: 'Opposition', note: 'Straight overhead at midnight: the best place to catch movers.', x: 80, y: 49, r: 14 },
      { id: 'morning', name: 'Morning sky', note: 'Rising in the east before dawn.', x: 124, y: 55, r: 14 },
    ],
    lockedCopy: t => `The dome is open on the ${t.name.toLowerCase()}. Frames are taken all week; moving dots land in your Control Station.`,
  },
  saturn: {
    short: 'Saturn orbiter',
    name: 'Saturn orbiter',
    station: 'In orbit around Saturn',
    blurb: 'A probe circling Saturn. Pick a spot on the planet or its rings and the camera zooms in.',
    sight: 'zoom',
    targets: [
      { id: 'pole', name: 'North pole', note: 'A six-sided storm sits over the pole.', x: 100, y: 32, r: 11 },
      { id: 'band', name: 'Storm band', note: 'Big storms break out in the cloud bands.', x: 86, y: 58, r: 11 },
      { id: 'ring', name: 'Ring gap', note: 'Ripples and moonlets in the thin outer rings.', x: 141, y: 38, r: 11 },
    ],
    lockedCopy: t => `The orbiter has zoomed in on the ${t.name.toLowerCase()}. Images come down to Earth through the week.`,
  },
}
const ORDER: InstrumentPointing[] = ['transit', 'deep-space', 'saturn']
const DISH = { x: 80, y: 82 } // the dome on the ground
const CRAFT = { x: 80, y: 62 } // the telescope in orbit
const EARTH = { x: 12, y: 10 } // where Saturn's pictures are sent

function stars(count: number, seed0: number): { x: number; y: number; r: number; o: number }[] {
  let seed = seed0
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  return Array.from({ length: count }, () => ({ x: rand() * W, y: rand() * H, r: 0.2 + rand() * 0.5, o: 0.3 + rand() * 0.7 }))
}

function targetAt(instrument: InstrumentPointing, x: number, y: number): Target | null {
  let best: Target | null = null
  let bestD = Infinity
  for (const t of INSTRUMENTS[instrument].targets) {
    const d = Math.hypot(t.x - x, t.y - y)
    if (d < t.r && d < bestD) { best = t; bestD = d }
  }
  return best
}

interface Props {
  /** The instrument already aimed this week, if any. */
  locked?: InstrumentPointing | null
  onLock: (pointing: InstrumentPointing) => void
  onCancel: () => void
}

function Sights({ kind, locked }: { kind: Sight; locked: boolean }) {
  const cls = styles.reticle
  if (kind === 'frame') return (
    <g data-testid="sky-reticle" data-locked={locked}>
      <rect x="-12" y="-7.5" width="24" height="15" className={cls} strokeDasharray={locked ? undefined : '2 1.2'} />
      <path d="M-12 0H-8M12 0H8M0 -7.5V-4M0 7.5V4" className={cls} />
    </g>
  )
  if (kind === 'zoom') return (
    <g data-testid="sky-reticle" data-locked={locked}>
      <circle r="5.5" className={cls} />
      <path d="M-8 -4V-8H-4M8 -4V-8H4M-8 4V8H-4M8 4V8H4" className={cls} />
    </g>
  )
  return (
    <g data-testid="sky-reticle" data-locked={locked}>
      <circle r="4.2" className={cls} />
      <path d="M-7 0H-2.5M2.5 0H7M0 -7V-2.5M0 2.5V7" className={cls} />
    </g>
  )
}

/**
 * The weekly pointing step. Pick which instrument you are driving; each has its own view, sight and
 * lock-on animation. Steer with the joystick, lock on, and the signal comes in over the week.
 */
export default function SkyPointing({ locked = null, onLock, onCancel }: Props) {
  const [instrument, setInstrument] = useState<InstrumentPointing>(locked ?? 'transit')
  const view = INSTRUMENTS[instrument]
  const [pos, setPos] = useState(() => (locked ? { x: INSTRUMENTS[locked].targets[1].x, y: INSTRUMENTS[locked].targets[1].y } : { x: W / 2, y: H / 2 }))
  const [confirmed, setConfirmed] = useState<{ instrument: InstrumentPointing; target: Target } | null>(null)
  const stick = useRef({ x: 0, y: 0 })
  const keys = useRef({ x: 0, y: 0 })
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const field = useMemo(() => stars(instrument === 'transit' ? 150 : 90, 7), [instrument])
  const over = targetAt(instrument, pos.x, pos.y)
  const showing = confirmed?.instrument === instrument ? confirmed.target : null

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
          y: Math.max(2, Math.min(H - 10, p.y + vy * SPEED * dt)),
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

  const switchTo = (id: InstrumentPointing) => {
    setInstrument(id)
    setPos({ x: W / 2, y: H / 2 })
  }

  const tgt = showing
  // Saturn's lock-on zooms the camera onto the chosen spot.
  const zoom = instrument === 'saturn' && tgt
    ? `translate(${W / 2}px, ${H / 2}px) scale(2.7) translate(${-tgt.x}px, ${-tgt.y}px)`
    : `translate(${W / 2}px, ${H / 2}px) scale(1) translate(${-W / 2}px, ${-H / 2}px)`
  const origin = instrument === 'transit' ? CRAFT : instrument === 'deep-space' ? DISH : EARTH

  return (
    <div className={styles.root} data-testid="sky-pointing" data-instrument={instrument} role="dialog" aria-label="Point your instruments">
      <button type="button" className={styles.close} data-testid="sky-pointing-back" onClick={onCancel}>BACK</button>
      <div className={styles.sky}>
        <div className={styles.plane}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className={styles.svg} aria-hidden="true">
            <defs>
              <radialGradient id="sky-glow" cx="50%" cy="100%" r="90%">
                <stop offset="0%" stopColor={instrument === 'deep-space' ? '#274a78' : '#1d3a63'} />
                <stop offset="100%" stopColor="#050a18" />
              </radialGradient>
              <linearGradient id="sky-saturn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e9d7a4" />
                <stop offset="35%" stopColor="#c9a96a" />
                <stop offset="55%" stopColor="#e6cf95" />
                <stop offset="80%" stopColor="#b08a52" />
                <stop offset="100%" stopColor="#8d6a3a" />
              </linearGradient>
              <radialGradient id="sky-earth" cx="50%" cy="0%" r="100%">
                <stop offset="0%" stopColor="#4aa3ff" />
                <stop offset="60%" stopColor="#1b4f9c" />
                <stop offset="100%" stopColor="#07162f" />
              </radialGradient>
            </defs>
            <rect width={W} height={H} fill="url(#sky-glow)" />

            <g className={styles.zoomLayer} style={{ transform: zoom }} data-testid="sky-zoom">
              {field.map((star, i) => <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.o} />)}

              {instrument === 'transit' && (
                <g>
                  {/* the camera's tiles of sky */}
                  {[0, 1, 2].map(i => <rect key={i} x={6 + i * 50} y={8} width={48} height={42} className={styles.tile} />)}
                  {view.targets.map(t => <circle key={t.id} cx={t.x} cy={t.y} r={t.r} className={styles.sector} data-active={(showing ?? over)?.id === t.id} />)}
                </g>
              )}

              {instrument === 'deep-space' && (
                <g>
                  <path d={`M0 70 Q ${W / 2} 36 ${W} 70`} className={styles.ecliptic} />
                  {view.targets.map(t => <circle key={t.id} cx={t.x} cy={t.y} r={t.r} className={styles.sector} data-active={(showing ?? over)?.id === t.id} />)}
                  {[0, 1, 2, 3, 4].map(i => <circle key={i} cx={20 + i * 30} cy={58 - (i % 3) * 4} r={0.7} className={styles.mover} style={{ animationDelay: `${-i * 1.3}s` }} />)}
                </g>
              )}

              {instrument === 'saturn' && (
                <g>
                  <ellipse cx="100" cy="52" rx="58" ry="30" className={styles.orbit} />
                  <g transform="rotate(-18 100 52)">
                    <ellipse cx="100" cy="52" rx="44" ry="11" className={styles.ringBack} />
                  </g>
                  <circle cx="100" cy="52" r="22" fill="url(#sky-saturn)" />
                  <g transform="rotate(-18 100 52)">
                    <path d="M56 52 A44 11 0 0 0 144 52" className={styles.ringFront} />
                  </g>
                  {view.targets.map(t => <circle key={t.id} cx={t.x} cy={t.y} r={t.r} className={styles.sector} data-active={(showing ?? over)?.id === t.id} />)}
                  {tgt && <circle cx={tgt.x} cy={tgt.y} r="3" className={styles.storm} />}
                </g>
              )}
            </g>

            {/* The instrument itself, never zoomed. */}
            {instrument === 'transit' && (
              <g>
                <circle cx="80" cy="150" r="96" fill="url(#sky-earth)" />
                <circle cx="80" cy="150" r="96" className={styles.limb} />
                <g transform={`translate(${CRAFT.x} ${CRAFT.y})`} data-testid="sky-craft">
                  <rect x="-2.2" y="-2.2" width="4.4" height="4.4" rx="0.6" fill="#d8e6f5" />
                  <rect x="-11" y="-1.4" width="7.5" height="2.8" fill="#5f8fd0" />
                  <rect x="3.5" y="-1.4" width="7.5" height="2.8" fill="#5f8fd0" />
                </g>
              </g>
            )}
            {instrument === 'deep-space' && (
              <g data-testid="sky-craft">
                <path d={`M0 ${H} V80 Q 30 76 55 82 Q ${DISH.x} 80 105 82 Q 135 76 ${W} 80 V${H} Z`} fill="#02050c" />
                <path d={`M${DISH.x - 7} 83 A7 7 0 0 1 ${DISH.x + 7} 83 Z`} fill="#3a4b66" />
                <rect x={DISH.x - 1} y="73" width="2" height="10" fill="#050a18" transform={`rotate(${tgt ? ((tgt.x - 80) / 5) : 0} ${DISH.x} 83)`} className={styles.slit} />
              </g>
            )}
            {instrument === 'saturn' && (
              <g>
                <circle cx={EARTH.x} cy={EARTH.y} r="4" fill="url(#sky-earth)" />
                <g className={styles.craft} data-parked={Boolean(tgt)} style={{ offsetPath: "path('M42 52 A58 30 0 1 1 158 52 A58 30 0 1 1 42 52')" }}>
                  <rect x="-1.8" y="-1.8" width="3.6" height="3.6" fill="#d8e6f5" />
                  <rect x="-7" y="-1" width="4.5" height="2" fill="#5f8fd0" />
                  <rect x="2.5" y="-1" width="4.5" height="2" fill="#5f8fd0" />
                </g>
              </g>
            )}

            {/* Lock-on: the signal travelling between the sky and the instrument. */}
            {tgt && instrument === 'transit' && (
              <g data-testid="sky-signal">
                {[-8, 0, 8].map((dx, i) => <line key={i} x1={tgt.x + dx} y1={tgt.y} x2={CRAFT.x} y2={CRAFT.y - 3} className={styles.beam} />)}
                {[0, 1, 2, 3].map(i => <circle key={i} r={0.9} className={styles.packet} style={{ offsetPath: `path('M${tgt.x} ${tgt.y} L ${CRAFT.x} ${CRAFT.y - 3}')`, animationDelay: `${i * 0.7}s` }} />)}
                {[0, 1].map(i => <circle key={i} cx={CRAFT.x} cy={CRAFT.y} r={4} className={styles.ring} style={{ animationDelay: `${i * 1.2}s` }} />)}
              </g>
            )}
            {tgt && instrument === 'deep-space' && (
              <g data-testid="sky-signal">
                <polygon points={`${DISH.x - 1.5},${DISH.y - 3} ${DISH.x + 1.5},${DISH.y - 3} ${tgt.x + 7},${tgt.y} ${tgt.x - 7},${tgt.y}`} className={styles.cone} />
                {[0, 1, 2, 3].map(i => <circle key={i} r={0.9} className={styles.packet} style={{ offsetPath: `path('M${tgt.x} ${tgt.y} L ${DISH.x} ${DISH.y - 3}')`, animationDelay: `${i * 0.7}s` }} />)}
              </g>
            )}
            {tgt && instrument === 'saturn' && (
              <g data-testid="sky-signal">
                <line x1="58" y1="64" x2={EARTH.x} y2={EARTH.y} className={styles.beam} />
                {[0, 1, 2, 3].map(i => <circle key={i} r={0.9} className={styles.packet} style={{ offsetPath: `path('M58 64 L ${EARTH.x} ${EARTH.y}')`, animationDelay: `${i * 0.7}s` }} />)}
                {[0, 1, 2].map(i => <circle key={i} cx={EARTH.x} cy={EARTH.y} r={4} className={styles.ring} style={{ animationDelay: `${i * 0.9}s` }} />)}
              </g>
            )}

            {(!confirmed || confirmed.instrument !== instrument) && !confirmed && (
              <g transform={`translate(${pos.x} ${pos.y})`}><Sights kind={view.sight} locked={false} /></g>
            )}
            {tgt && <g transform={`translate(${tgt.x} ${tgt.y})`} style={instrument === 'saturn' ? { display: 'none' } : undefined}><Sights kind={view.sight} locked /></g>}
          </svg>

          {instrument !== 'saturn' || !tgt ? view.targets.map(t => (
            <span key={t.id} className={styles.sectorName} data-active={(showing ?? over)?.id === t.id} style={{ left: `${(t.x / W) * 100}%`, top: `${((t.y + t.r) / H) * 100}%` }}>{t.name}</span>
          )) : null}
          <span className={styles.tag} data-testid="sky-station">{view.station}</span>
        </div>
      </div>

      <div className={styles.panel}>
        <p className={styles.kicker}>Point your instruments</p>
        {!confirmed && (
          <div className={styles.tabs} role="radiogroup" aria-label="Instrument">
            {ORDER.map(id => (
              <button key={id} type="button" role="radio" aria-checked={id === instrument} className={styles.tab} data-active={id === instrument} data-testid={`sky-instrument-${id}`} onClick={() => switchTo(id)}>
                {INSTRUMENTS[id].short}
              </button>
            ))}
          </div>
        )}
        {confirmed ? (
          <>
            <h2 className={styles.title} data-testid="sky-pointing-title">{INSTRUMENTS[confirmed.instrument].name}: {confirmed.target.name}</h2>
            <p className={styles.copy}>{INSTRUMENTS[confirmed.instrument].lockedCopy(confirmed.target)}</p>
            <button type="button" className={styles.primary} data-testid="sky-pointing-done" onClick={() => onLock(confirmed.instrument)}>SIGNALS INCOMING · CONTINUE</button>
          </>
        ) : (
          <>
            <h2 className={styles.title} data-testid="sky-pointing-title">{over ? over.name : view.name}</h2>
            <p className={styles.copy}>{over ? over.note : view.blurb}</p>
            <button type="button" className={styles.primary} data-testid="sky-pointing-lock" disabled={!over} onClick={() => over && setConfirmed({ instrument, target: over })}>
              {over ? (instrument === 'saturn' ? 'ZOOM IN HERE' : 'POINT HERE') : 'STEER TO A TARGET'}
            </button>
          </>
        )}
      </div>

      {!confirmed && (
        <div
          className={styles.stick}
          data-testid="sky-stick"
          role="application"
          aria-label="Joystick: steer the sight"
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
