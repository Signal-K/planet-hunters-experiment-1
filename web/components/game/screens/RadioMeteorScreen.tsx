'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { GalaxyMap } from '@/components/game/MissionBoard'
import type { Player } from '@/lib/game-types'
import { fetchQueuedRadioSubjects, type RadioMeteorBox, type RadioMeteorClassification, type RadioMeteorSubject } from '@/lib/radio-meteors'
import board from '@/components/game/MissionBoard.module.css'
import styles from './RadioMeteorScreen.module.css'

interface RadioMeteorScreenProps {
  player: Player
  onBack: () => void
  onSubmit: (classification: RadioMeteorClassification) => void
}

/** A tap (no drag) drops a box this size, in source pixels: about one meteor echo on a BRAMS spectrogram. */
const TAP_BOX = { width: 26, height: 64 }
/** Drags smaller than this many source pixels count as a tap. */
const MIN_DRAG = 8
/** Wider than this (source px, about 30 s of a 5-minute recording) is almost always an aircraft, not a meteor. */
const WIDE_BOX = 95
/** Every BRAMS spectrogram covers five minutes. */
const RECORDING_SECONDS = 300

type Draft = { x0: number; y0: number; x1: number; y1: number }
type Last = { kind: 'logged'; echoes: number; at: string } | { kind: 'quiet'; at: string } | { kind: 'wide' } | { kind: 'boxed' } | { kind: 'deleted' } | null

const toBox = (d: Draft): RadioMeteorBox => ({
  x: Math.round(Math.min(d.x0, d.x1)),
  y: Math.round(Math.min(d.y0, d.y1)),
  width: Math.round(Math.abs(d.x1 - d.x0)),
  height: Math.round(Math.abs(d.y1 - d.y0)),
})

const BRIEFING = [
  'Radio desk here. Our transmitter at Dourbes sends one steady tone at 49.97 MHz. That is the bright line across the middle.',
  'When a meteor burns up, its trail bounces that tone back to us for a moment. It shows as a short upright mark crossing the line.',
  'The long sweeping curves are aircraft, so leave those. Box every meteor, then send me the recording.',
]

/** "2026-07-25 13:55 UTC" plus seconds → "13:57:30". */
function clock(recordedAt: string | null, seconds: number): string {
  const m = /(\d{2}):(\d{2}) UTC/.exec(recordedAt ?? '')
  const base = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 : 0
  const t = Math.round(base + seconds)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`
}

/** A physical rotary control: drag (any direction), scroll, or arrow keys turn it through 270°. */
function Dial({ label, readout, value, min, max, step, disabled, testId, onChange }: {
  label: string
  readout: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  testId: string
  onChange: (value: number) => void
}) {
  const drag = useRef<{ x: number; y: number; v: number } | null>(null)
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  const angle = -135 + ((value - min) / (max - min)) * 270
  const ticks = Array.from({ length: 11 }, (_, i) => -135 + i * 27)
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, v: value }
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    // Right or up turns it clockwise; 140px of travel sweeps the whole range.
    const travel = (e.clientX - drag.current.x) - (e.clientY - drag.current.y)
    onChange(clamp(drag.current.v + (travel / 140) * (max - min)))
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    onChange(clamp(value + dir * step))
  }
  return (
    <div className={styles.dial} data-disabled={disabled || undefined}>
      <div
        className={styles.knob}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={readout}
        aria-disabled={disabled || undefined}
        data-testid={testId}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
        onWheel={e => { if (!disabled) onChange(clamp(value + (e.deltaY < 0 ? step : -step))) }}
        onKeyDown={key}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true">
          {ticks.map(t => <line key={t} x1="32" y1="2" x2="32" y2="7" transform={`rotate(${t} 32 32)`} />)}
        </svg>
        <span className={styles.cap} style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true"><i /></span>
      </div>
      <span className={styles.dialLabel}>{label}</span>
      <span className={styles.dialValue}>{readout}</span>
    </div>
  )
}

export default function RadioMeteorScreen({ player, onBack, onSubmit }: RadioMeteorScreenProps) {
  const done = player.radioMeteorClassifications ?? {}
  const total = Object.keys(done).length
  const [queue, setQueue] = useState<RadioMeteorSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [boxes, setBoxes] = useState<RadioMeteorBox[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [gain, setGain] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState(0.5)
  const [briefing, setBriefing] = useState<number | null>(total === 0 ? 0 : null)
  const [last, setLast] = useState<Last>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchQueuedRadioSubjects(player.radioMeteorClassifications ?? {})
      .then(list => { if (!cancelled) { setQueue(list); setFailed(false) } })
      .catch(() => { if (!cancelled) setFailed(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // Refetch only on entry; a submission advances the local queue instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subject = queue[0] ?? null
  useEffect(() => { setBoxes([]); setSelected(null); setDraft(null); setSize(null) }, [subject?.id])

  const point = (e: PointerEvent<SVGSVGElement>) => {
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm || !size) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: Math.max(0, Math.min(size.w, p.x)), y: Math.max(0, Math.min(size.h, p.y)) }
  }
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || !size) return
    const p = point(e)
    if (!p) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setSelected(null)
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!draft) return
    const p = point(e)
    if (p) setDraft({ ...draft, x1: p.x, y1: p.y })
  }
  const up = () => {
    if (!draft || !size) return
    const dragged = Math.abs(draft.x1 - draft.x0) >= MIN_DRAG || Math.abs(draft.y1 - draft.y0) >= MIN_DRAG
    const box = dragged ? toBox(draft) : {
      x: Math.round(Math.max(0, Math.min(size.w - TAP_BOX.width, draft.x0 - TAP_BOX.width / 2))),
      y: Math.round(Math.max(0, Math.min(size.h - TAP_BOX.height, draft.y0 - TAP_BOX.height / 2))),
      ...TAP_BOX,
    }
    setDraft(null)
    setBoxes(prev => [...prev, box])
    setSelected(boxes.length)
    setBriefing(null)
    setLast(box.width > WIDE_BOX ? { kind: 'wide' } : { kind: 'boxed' })
  }
  const removeBox = () => {
    setBoxes(prev => prev.filter((_, i) => i !== (selected ?? prev.length - 1)))
    setSelected(null)
    setLast({ kind: 'deleted' })
  }
  const submit = (list: RadioMeteorBox[]) => {
    if (!subject || !size) return
    onSubmit({
      subjectId: subject.id,
      workflowId: subject.workflowId,
      imageUrl: subject.imageUrl,
      filename: subject.filename,
      imageWidth: size.w,
      imageHeight: size.h,
      boxes: list,
      submittedAt: Date.now(),
    })
    const at = clock(subject.recordedAt, 0).slice(0, 5)
    setLast(list.length ? { kind: 'logged', echoes: list.length, at } : { kind: 'quiet', at })
    setBriefing(null)
    setQueue(prev => prev.slice(1))
  }

  const station = subject?.station ?? 'BRAMS'
  const line = briefing != null ? BRIEFING[briefing]
    : loading ? 'Tuning in. Pulling the next recording off the Belgian network.'
    : failed ? 'I can’t reach the archive from here. Check your connection and come back.'
    : !subject ? (last?.kind === 'logged' || last?.kind === 'quiet' ? 'That was the last one in this batch. Nice work. More come in as the stations upload.' : 'Nothing waiting in the queue right now. More come in as the stations upload.')
    : last?.kind === 'wide' ? 'That box is very wide. A meteor only lasts a second or so. A long drift is usually an aircraft.'
    : last?.kind === 'boxed' && boxes.length === 1 ? 'That’s one. Run along the beacon line. Turn up the zoom if the marks are faint.'
    : last?.kind === 'boxed' ? `${boxes.length} echoes boxed. Send it when you’ve swept the whole five minutes.`
    : last?.kind === 'deleted' ? (boxes.length ? `Box removed. ${boxes.length} left on this one.` : 'Box removed. Back to a clean sheet.')
    : last?.kind === 'logged' ? `Logged ${last.echoes} echo${last.echoes === 1 ? '' : 'es'} from ${last.at}. Next recording, from ${station}.`
    : last?.kind === 'quiet' ? `Quiet sweep from ${last.at}, logged. That counts too. Here’s the next one, from ${station}.`
    : `Recording from ${station}, starting ${clock(subject.recordedAt, 0).slice(0, 5)} UTC. Box every meteor, or tell me it’s quiet.`

  // The view: zoom scales both axes about the beacon line; pan moves along time.
  const left = -(zoom - 1) * pan * 100
  const top = -(zoom - 1) * 50
  const from = ((zoom - 1) * pan / zoom) * RECORDING_SECONDS
  const to = from + RECORDING_SECONDS / zoom
  const draftBox = draft ? toBox(draft) : null
  const status = loading ? 'TUNING' : failed ? 'NO SIGNAL' : !subject ? 'QUEUE EMPTY' : 'LIVE QUEUE'

  return (
    <div className={board.scene} data-testid="radio-meteor-screen" data-screen="radio-meteors">
      <section className={board.dispatch} aria-label="Meteor radio">
        <nav className={board.rail} aria-label="Meteor radio">
          <button type="button" className={`${board.round} ${board.railClose}`} data-testid="radio-back" aria-label="Close" onClick={onBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
          </button>
        </nav>
        <GalaxyMap targets={[]} mode="ambient" view="belt" onView={() => {}} />
        <article className={styles.workspace}>
          <section className={styles.receiver} aria-label="Receiver">
            <header className={styles.readout}>
              <span className={styles.eyebrow}><i className={styles.led} data-state={subject ? 'live' : failed ? 'off' : 'wait'} aria-hidden="true" />{status} · {subject ? `BRAMS ${station}` : 'BRAMS'}</span>
              <h2 data-testid="radio-title">{subject?.recordedAt ?? 'Meteor radio'}</h2>
            </header>
            <div className={styles.console}>
            <div className={styles.well}>
              <div className={styles.screen} style={size ? { aspectRatio: `${size.w} / ${size.h}` } : undefined} data-testid={subject ? 'radio-display' : 'radio-meteor-standby'}>
                {subject ? (
                  <div className={styles.strip} style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%`, left: `${left}%`, top: `${top}%` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.image}
                      data-testid="radio-spectrogram"
                      src={subject.imageUrl}
                      alt={`Radio spectrogram ${subject.filename}`}
                      crossOrigin="anonymous"
                      draggable={false}
                      style={{ filter: `brightness(${0.75 + gain * 0.25}) contrast(${gain}) saturate(${0.8 + gain * 0.2})` }}
                      onLoad={e => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                    />
                    {size && (
                      <svg
                        ref={svgRef}
                        className={styles.draw}
                        data-testid="radio-draw"
                        viewBox={`0 0 ${size.w} ${size.h}`}
                        preserveAspectRatio="none"
                        onPointerDown={down}
                        onPointerMove={move}
                        onPointerUp={up}
                        onPointerCancel={() => setDraft(null)}
                      >
                        {boxes.map((b, i) => (
                          <rect
                            key={i}
                            className={styles.box}
                            data-selected={selected === i || undefined}
                            data-testid={`radio-box-${i}`}
                            x={b.x}
                            y={b.y}
                            width={b.width}
                            height={b.height}
                            vectorEffect="non-scaling-stroke"
                            onPointerDown={e => { e.stopPropagation(); setSelected(i) }}
                          />
                        ))}
                        {draftBox && <rect className={styles.draft} {...draftBox} vectorEffect="non-scaling-stroke" />}
                      </svg>
                    )}
                  </div>
                ) : (
                  <p className={styles.standby}>{status}</p>
                )}
                <span className={styles.beacon} data-highlight={briefing === 0 || undefined} aria-hidden="true">49.97 MHz</span>
              </div>
            </div>
            <div className={styles.timeline} aria-label="Visible time">
              <span>{clock(subject?.recordedAt ?? null, from)}</span>
              <i style={{ marginLeft: `${(from / RECORDING_SECONDS) * 100}%`, width: `${100 / zoom}%` }} aria-hidden="true" />
              <span>{clock(subject?.recordedAt ?? null, to)}</span>
            </div>
            <div className={styles.deck}>
              <Dial label="GAIN" testId="radio-gain" readout={`${Math.round(gain * 100)}%`} value={gain} min={0.6} max={2.2} step={0.1} onChange={setGain} />
              <Dial label="ZOOM" testId="radio-zoom" readout={`×${zoom.toFixed(1)}`} value={zoom} min={1} max={4} step={0.5} onChange={setZoom} />
              <Dial label="SWEEP" testId="radio-sweep" readout={zoom > 1 ? `${Math.round(pan * 100)}%` : 'FULL'} value={pan} min={0} max={1} step={0.05} disabled={zoom === 1} onChange={setPan} />
            </div>
            </div>
          </section>
          <section className={styles.desk} aria-label="Radio desk">
            <div className={styles.comms} data-testid="radio-dialogue" aria-live="polite">
              <span className={styles.speaker}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13v8M8 21h8" /><circle cx="12" cy="10" r="2" /><path d="M7.8 5.8a6 6 0 0 0 0 8.4M16.2 5.8a6 6 0 0 1 0 8.4M5 3a10 10 0 0 0 0 14M19 3a10 10 0 0 1 0 14" /></svg>
                Radio desk · {station}
              </span>
              <p data-testid="radio-question">{line}</p>
              {briefing != null && (
                <button type="button" className={styles.next} data-testid="radio-briefing-next" onClick={() => setBriefing(briefing + 1 < BRIEFING.length ? briefing + 1 : null)}>
                  {briefing + 1 < BRIEFING.length ? `NEXT · ${briefing + 1}/${BRIEFING.length}` : 'START LISTENING'}
                </button>
              )}
            </div>
            <div className={styles.tally}>
              <span><b data-testid="radio-echoes">{boxes.length}</b>echoes</span>
              <span><b data-testid="radio-checked">{total}</b>checked</span>
              {briefing == null && <button type="button" className={styles.brief} data-testid="radio-briefing" onClick={() => setBriefing(0)}>BRIEFING</button>}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} data-testid="radio-delete-box" disabled={!boxes.length} onClick={removeBox}>{selected != null ? 'DELETE BOX' : 'UNDO'}</button>
              <button type="button" className={styles.secondary} data-testid="radio-no-meteors" disabled={!subject || !size || boxes.length > 0} onClick={() => submit([])}>NO METEORS</button>
              <button type="button" className={board.contractTake} data-testid="radio-submit" disabled={!subject || !size || boxes.length === 0} onClick={() => submit(boxes)}>SEND {boxes.length || ''} {boxes.length === 1 ? 'ECHO' : 'ECHOES'}</button>
            </div>
          </section>
        </article>
      </section>
    </div>
  )
}
