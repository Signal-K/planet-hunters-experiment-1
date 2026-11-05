'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { InstrumentPointing } from '@/lib/research/paths'
import { GroundScene, SaturnScene, Sight, TransitScene, groundGeom, saturnGeom, transitGeom, type Geom, type SkyTarget } from './SkyScenes'
import { SceneActions, ScenePill, ScenePrimary, SceneTop } from '@/components/game/hud/SceneChrome'
import styles from './SkyPointing.module.css'

const SPEED = 46 // view units per second at full stick

interface Instrument {
  short: string
  name: string
  station: string
  blurb: string
  sight: 'frame' | 'cross' | 'zoom'
  lockLabel: string
  lockedCopy: (target: SkyTarget) => string
}

/** Three instruments, three different ways of looking. */
const INSTRUMENTS: Record<InstrumentPointing, Instrument> = {
  transit: {
    short: 'Space telescope',
    name: 'Space telescope',
    station: 'In orbit · 375,000 km above Earth',
    blurb: 'A wide-field camera above the air. Slew it to a patch of stars and stare: planets show up as tiny dips in starlight.',
    sight: 'frame',
    lockLabel: 'POINT HERE',
    lockedCopy: t => `Staring at the ${t.name.toLowerCase()}. Starlight is measured nonstop; dips reach your Control Station through the week.`,
  },
  'deep-space': {
    short: 'Ground telescope',
    name: 'Ground telescope',
    station: 'On the ground · dome open · laser guide star on',
    blurb: 'A dome on the hill. Swing the slit along the ecliptic, where asteroids drift past the stars.',
    sight: 'cross',
    lockLabel: 'POINT HERE',
    lockedCopy: t => `Dome open on the ${t.name.toLowerCase()}. Frames are taken all week; moving dots land in your Control Station.`,
  },
  saturn: {
    short: 'Saturn orbiter',
    name: 'Saturn orbiter',
    station: 'In orbit around Saturn',
    blurb: 'A probe circling Saturn. Pick a spot on the planet or its rings and the camera zooms in.',
    sight: 'zoom',
    lockLabel: 'ZOOM IN HERE',
    lockedCopy: t => `Zoomed in on the ${t.name.toLowerCase()}. Images come down to Earth through the week.`,
  },
}
const ORDER: InstrumentPointing[] = ['transit', 'deep-space', 'saturn']

function geomFor(id: InstrumentPointing, g: Geom): SkyTarget[] {
  return id === 'transit' ? transitGeom(g).targets : id === 'deep-space' ? groundGeom(g).targets : saturnGeom(g).targets
}

function targetAt(targets: SkyTarget[], x: number, y: number): SkyTarget | null {
  let best: SkyTarget | null = null
  let bestD = Infinity
  for (const t of targets) {
    if (Math.abs(t.x - x) <= t.hw + 1 && Math.abs(t.y - y) <= t.hh + 1) {
      const d = Math.hypot(t.x - x, t.y - y)
      if (d < bestD) { best = t; bestD = d }
    }
  }
  return best
}

function Icon({ id }: { id: InstrumentPointing }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {id === 'transit' && <><rect x="9" y="8" width="6" height="8" rx="1" /><path d="M2 10h6v4H2zM16 10h6v4h-6zM12 8V4" /></>}
      {id === 'deep-space' && <><path d="M4 19a8 8 0 0 1 16 0z" /><path d="M13 11l4-6" /><path d="M2 19h20" /></>}
      {id === 'saturn' && <><circle cx="12" cy="12" r="5" /><ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(-18 12 12)" /></>}
    </svg>
  )
}

interface Props {
  /** The instrument already aimed this week, if any. */
  locked?: InstrumentPointing | null
  onLock: (pointing: InstrumentPointing) => void
  onCancel: () => void
}

/**
 * The weekly pointing step, as one full-screen viewport. Pick the instrument you are driving; each has its
 * own scene, sight and lock-on. Steer with the joystick, lock on, and the signal comes in over the week.
 */
export default function SkyPointing({ locked = null, onLock, onCancel }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 926, h: 428 })
  const [instrument, setInstrument] = useState<InstrumentPointing>(locked ?? 'transit')
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [confirmed, setConfirmed] = useState<{ instrument: InstrumentPointing; id: string } | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const stick = useRef({ x: 0, y: 0 })
  const keys = useRef({ x: 0, y: 0 })
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => setBox({ w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight) })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The view is 100 units on its short side.
  const aspect = box.w / box.h
  const portrait = aspect < 1
  const W = portrait ? 100 : 100 * aspect
  const H = portrait ? 100 / aspect : 100
  const g: Geom = { W, H, portrait }
  const targets = geomFor(instrument, g)
  const view = INSTRUMENTS[instrument]
  const at = pos ?? { x: W / 2, y: H / 2 }
  const over = confirmed ? null : targetAt(targets, at.x, at.y)
  const showing = confirmed?.instrument === instrument ? targets.find(t => t.id === confirmed.id) ?? null : null
  const unitsPerPx = W / box.w

  const live = useRef({ W, H })
  live.current = { W, H }

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
        setPos(p => {
          const { W: w, H: h } = live.current
          const cur = p ?? { x: w / 2, y: h / 2 }
          return { x: Math.max(3, Math.min(w - 3, cur.x + vx * SPEED * dt)), y: Math.max(3, Math.min(h - 3, cur.y + vy * SPEED * dt)) }
        })
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

  // Saturn's lock-on zooms the camera in a beat after the lock.
  useEffect(() => {
    if (!confirmed || confirmed.instrument !== 'saturn') { setZoomed(false); return }
    const timer = window.setTimeout(() => setZoomed(true), 150)
    return () => window.clearTimeout(timer)
  }, [confirmed])

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

  const switchTo = (id: InstrumentPointing) => { setInstrument(id); setPos(null) }
  useEffect(() => { setPos(null) }, [portrait])

  const sightSize = instrument === 'transit' ? { w: targets[0].hw * 2, h: targets[0].hh * 2 } : { w: 0, h: 0 }
  const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })
  const readout = showing ?? over
  const lockedNow = confirmed && showing ? { instrument: confirmed.instrument, target: showing } : null

  return (
    <div ref={rootRef} className={styles.root} data-testid="sky-pointing" data-instrument={instrument} data-portrait={portrait} aria-label="Point your instruments">
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {instrument === 'transit' && <TransitScene g={g} target={showing} />}
        {instrument === 'deep-space' && <GroundScene g={g} target={showing} />}
        {instrument === 'saturn' && <SaturnScene g={g} target={showing} zoomed={zoomed} />}
        {!confirmed && (
          <g transform={`translate(${at.x} ${at.y})`}><Sight kind={view.sight} w={sightSize.w} h={sightSize.h} locked={false} /></g>
        )}
        {showing && instrument === 'transit' && <g transform={`translate(${showing.x} ${showing.y})`}><Sight kind="frame" w={sightSize.w} h={sightSize.h} locked /></g>}
        {showing && instrument === 'deep-space' && <g transform={`translate(${showing.x} ${showing.y})`}><Sight kind="cross" w={0} h={0} locked /></g>}
      </svg>
      <div className={styles.vignette} aria-hidden="true" />

      {!(instrument === 'saturn' && zoomed) && targets.map(t => (
        <span key={t.id} className={styles.label} data-active={readout?.id === t.id} data-side={t.side ?? 'below'} style={{ ...(t.side === 'above' ? pct(t.x, t.y - t.hh) : t.side === 'left' ? pct(t.x - t.hw, t.y) : t.side === 'right' ? pct(t.x + t.hw, t.y) : pct(t.x, t.y + t.hh)) }}>{t.name}</span>
      ))}

      <SceneTop onBack={onCancel} testId="sky-pointing-back">
        <ScenePill align="end" testId="sky-station">{view.station}</ScenePill>
      </SceneTop>

      <div className={styles.caption}>
        <h2 className={styles.title} data-testid="sky-pointing-title">{lockedNow ? `${INSTRUMENTS[lockedNow.instrument].name}: ${lockedNow.target.name}` : readout ? readout.name : view.name}</h2>
        <p className={styles.note}>{lockedNow ? INSTRUMENTS[lockedNow.instrument].lockedCopy(lockedNow.target) : readout ? readout.note : view.blurb}</p>
        {(readout || lockedNow) && <p className={styles.coord}>{(lockedNow?.target ?? readout)!.coord}</p>}
      </div>

      {!confirmed && (
        <>
          <div className={styles.rail} role="radiogroup" aria-label="Instrument">
            {ORDER.map(id => (
              <button key={id} type="button" role="radio" aria-checked={id === instrument} className={styles.tab} data-active={id === instrument} data-testid={`sky-instrument-${id}`} onClick={() => switchTo(id)}>
                <Icon id={id} /><span>{INSTRUMENTS[id].short}</span>
              </button>
            ))}
          </div>
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
        </>
      )}

      <SceneActions className={styles.actionSlot}>
        {confirmed ? (
          <ScenePrimary testId="sky-pointing-done" onClick={() => onLock(confirmed.instrument)}>SIGNALS INCOMING · CONTINUE</ScenePrimary>
        ) : (
          <ScenePrimary testId="sky-pointing-lock" disabled={!over} onClick={() => over && setConfirmed({ instrument, id: over.id })}>
            {over ? view.lockLabel : 'STEER TO A TARGET'}
          </ScenePrimary>
        )}
      </SceneActions>
      <span hidden>{unitsPerPx}</span>
    </div>
  )
}
