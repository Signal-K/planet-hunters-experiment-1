'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { InstrumentPointing } from '@/lib/research/paths'
import { LANDMARKS, TOTAL_FIELDS, clampDec, fieldId, formatAim, landmarkNear, mappedCount, mappedPercent, wrapRa, type SkyAim, type SkyMap } from '@/lib/research/sky-map'
import { SkyChart, project, sightCentre } from './SkyChart'
import { GroundScene, SaturnScene, Sight, TransitScene, groundGeom, saturnGeom, transitGeom, type Geom, type SkyTarget } from './SkyScenes'
import { SceneActions, ScenePill, ScenePrimary, SceneTop, SceneVignette } from '@/components/game/hud/SceneChrome'
import styles from './SkyPointing.module.css'

const SPEED = 46 // view units per second at full stick (Saturn's view)
const SKY_SPEED = 40 // degrees of sky per second at full stick
const START_AIM: SkyAim = { ra: 291, dec: 44 }

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
    station: 'In orbit · 600 km above Earth',
    blurb: 'A wide-field camera above the air. Steer it anywhere on the sky and stare: planets show up as tiny dips in starlight.',
    sight: 'frame',
    lockLabel: 'POINT HERE',
    lockedCopy: t => `Staring at the ${t.name.toLowerCase()}. Starlight is measured nonstop; dips reach your Data hub through the week.`,
  },
  'deep-space': {
    short: 'Ground telescope',
    name: 'Ground telescope',
    station: 'On the ground · dome open',
    blurb: 'A dome on the hill. Swing the slit anywhere on the sky; asteroids drift past the stars.',
    sight: 'cross',
    lockLabel: 'POINT HERE',
    lockedCopy: t => `Dome open on the ${t.name.toLowerCase()}. Frames are taken all week; moving dots land in your Data hub.`,
  },
  saturn: {
    short: 'Saturn orbiter',
    name: 'Saturn orbiter',
    station: 'In orbit around Saturn',
    blurb: 'A probe circling Saturn. Steer to any spot on the planet or its rings and the camera zooms in.',
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
  /** The telescope the sky asked the player to position. */
  start?: InstrumentPointing
  /** Telescopes the player has online; only these can be picked. */
  online?: InstrumentPointing[]
  onLock: (pointing: InstrumentPointing, aim?: SkyAim, sector?: string) => void
  /** Saves the aim the moment the player locks on, so leaving by Back keeps it. */
  onAim?: (pointing: InstrumentPointing, aim?: SkyAim, sector?: string) => void
  onCancel: () => void
  /** Fields the player's telescopes have already mapped. */
  mapped?: SkyMap
}

/**
 * The weekly pointing step, as one full-screen viewport. Pick the instrument you are driving; each has its
 * own scene, sight and lock-on. Steer with the joystick, lock on, and the signal comes in over the week.
 */
export default function SkyPointing({ start = 'transit', online, onLock, onAim, onCancel, mapped }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 926, h: 428 })
  const [instrument, setInstrument] = useState<InstrumentPointing>(start)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [aim, setAim] = useState<SkyAim>(START_AIM)
  const [confirmed, setConfirmed] = useState<{ instrument: InstrumentPointing; target: SkyTarget; aim: SkyAim } | null>(null)
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
  const freeSky = instrument !== 'saturn'
  const targets = freeSky ? [] : geomFor(instrument, g)
  const view = INSTRUMENTS[instrument]
  const at = pos ?? { x: W / 2, y: H / 2 }
  const near = freeSky ? landmarkNear(aim) : null
  const field = fieldId(aim)
  const alreadyMapped = !!mapped?.[field]
  const over = confirmed ? null : freeSky ? null : targetAt(targets, at.x, at.y)
  const sightTarget = (id: string, name: string, note: string, coord: string, x: number, y: number, hw: number, hh: number): SkyTarget => ({ id, name, note, coord, x, y, hw, hh })
  const showing = confirmed && confirmed.instrument === instrument ? confirmed.target : null
  const unitsPerPx = W / box.w
  const mappedLine = `Sky mapped: ${mappedCount(mapped)} of ${TOTAL_FIELDS} fields (${mappedPercent(mapped).toFixed(1)}%)`

  const live = useRef({ W, H, freeSky })
  live.current = { W, H, freeSky }

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
        if (live.current.freeSky) {
          setAim(a => ({ ra: wrapRa(a.ra + (vx * SKY_SPEED * dt) / Math.max(0.35, Math.cos((a.dec * Math.PI) / 180))), dec: clampDec(a.dec - vy * SKY_SPEED * dt) }))
        } else {
          setPos(p => {
            const { W: w, H: h } = live.current
            const cur = p ?? { x: w / 2, y: h / 2 }
            return { x: Math.max(3, Math.min(w - 3, cur.x + vx * SPEED * dt)), y: Math.max(3, Math.min(h - 3, cur.y + vy * SPEED * dt)) }
          })
        }
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

  const sightSize = instrument === 'transit' ? { w: portrait ? 34 : 38, h: portrait ? 22 : 24 } : { w: 0, h: 0 }
  const lockHere = () => {
    if (freeSky) {
      const name = near?.name ?? 'Open sky'
      setConfirmed({ instrument, aim, target: sightTarget('aim', name, near?.note ?? 'A patch of sky nobody has pointed at yet.', formatAim(aim), sightCentre(g).x, sightCentre(g).y, instrument === 'transit' ? sightSize.w / 2 : 9, instrument === 'transit' ? sightSize.h / 2 : 9) })
      onAim?.(instrument, aim)
    } else {
      const t = over ?? sightTarget('free', 'Open view', 'Zoomed on the spot you chose.', 'FREE POINTING', at.x, at.y, 5.5, 5.5)
      setConfirmed({ instrument, aim, target: t })
      onAim?.(instrument, undefined, t.id)
    }
  }
  const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })
  const readout = showing ?? over
  const lockedNow = confirmed && showing ? { instrument: confirmed.instrument, target: showing } : null
  const skyTitle = near?.name ?? 'Open sky'
  const skyNote = near ? near.note : alreadyMapped ? 'You have already mapped this field. Lock on to look again, or steer somewhere new.' : 'Not mapped yet. Lock on to add this field to your sky map.'

  return (
    <div ref={rootRef} className={styles.root} data-testid="sky-pointing" data-instrument={instrument} data-portrait={portrait} aria-label="Point your instruments">
      <div className={styles.sky} aria-hidden="true">
        <img src="/game/assets/base/kit/space-bands.png" alt="" draggable={false} className={styles.bands} />
        <div className={styles.starTile} data-layer="far" />
        <div className={styles.starTile} data-layer="mid" />
        <div className={styles.starTile} data-layer="near" />
      </div>
      <svg className={styles.svg} shapeRendering="crispEdges" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {freeSky && <SkyChart g={g} aim={aim} mapped={mapped} current={field} />}
        {instrument === 'transit' && <TransitScene g={g} target={showing} aim={showing ? { x: showing.x, y: showing.y } : sightCentre(g)} bare />}
        {instrument === 'deep-space' && <GroundScene g={g} target={showing} bare />}
        {instrument === 'saturn' && <SaturnScene g={g} target={showing} zoomed={zoomed} />}
        {!confirmed && (
          <g transform={`translate(${freeSky ? sightCentre(g).x : at.x} ${freeSky ? sightCentre(g).y : at.y})`}><Sight kind={view.sight} w={sightSize.w} h={sightSize.h} locked={false} /></g>
        )}
        {showing && instrument === 'transit' && <g transform={`translate(${showing.x} ${showing.y})`}><Sight kind="frame" w={sightSize.w} h={sightSize.h} locked /></g>}
        {showing && instrument === 'deep-space' && <g transform={`translate(${showing.x} ${showing.y})`}><Sight kind="cross" w={0} h={0} locked /></g>}
      </svg>
      <SceneVignette />

      {!(instrument === 'saturn' && zoomed) && targets.map(t => (
        <span key={t.id} className={styles.label} data-active={readout?.id === t.id} data-side={t.side ?? 'below'} style={{ ...(t.side === 'above' ? pct(t.x, t.y - t.hh) : t.side === 'left' ? pct(t.x - t.hw, t.y) : t.side === 'right' ? pct(t.x + t.hw, t.y) : pct(t.x, t.y + t.hh)) }}>{t.name}</span>
      ))}
      {freeSky && !confirmed && LANDMARKS.map(l => {
        const p = project(aim, g, l.ra, l.dec)
        if (p.x < 6 || p.x > W - 6 || p.y < H * 0.2 || p.y > H * 0.6) return null
        return <span key={l.id} className={styles.label} data-active={near?.id === l.id} data-side="below" style={pct(p.x, p.y + 2)}>{l.name}</span>
      })}

      <SceneTop onBack={onCancel} testId="sky-pointing-back">
        <ScenePill align="end" testId="sky-station">{view.station}</ScenePill>
      </SceneTop>

      <div className={styles.caption}>
        <h2 className={styles.title} data-testid="sky-pointing-title">{lockedNow ? `${INSTRUMENTS[lockedNow.instrument].name}: ${lockedNow.target.name}` : freeSky ? skyTitle : readout ? readout.name : view.name}</h2>
        <p className={styles.note}>{lockedNow ? INSTRUMENTS[lockedNow.instrument].lockedCopy(lockedNow.target) : freeSky ? skyNote : readout ? readout.note : view.blurb}</p>
        {freeSky ? <p className={styles.coord} data-testid="sky-coord">{formatAim(confirmed?.aim ?? aim)}</p> : (readout || lockedNow) && <p className={styles.coord}>{(lockedNow?.target ?? readout)!.coord}</p>}
        {freeSky && <p className={styles.mapline} data-testid="sky-mapped">{mappedLine}</p>}
      </div>

      {!confirmed && (
        <>
          <div className={styles.rail} role="radiogroup" aria-label="Instrument">
            {ORDER.filter(id => !online || online.includes(id)).map(id => (
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
          <ScenePrimary testId="sky-pointing-done" onClick={() => onLock(confirmed.instrument, confirmed.instrument === 'saturn' ? undefined : confirmed.aim, confirmed.instrument === 'saturn' ? confirmed.target.id : undefined)}>SIGNALS INCOMING · CONTINUE</ScenePrimary>
        ) : (
          <ScenePrimary testId="sky-pointing-lock" onClick={lockHere}>
            {freeSky ? (alreadyMapped ? 'POINT HERE AGAIN' : 'MAP THIS FIELD') : view.lockLabel}
          </ScenePrimary>
        )}
      </SceneActions>
      <span hidden>{unitsPerPx}</span>
    </div>
  )
}
