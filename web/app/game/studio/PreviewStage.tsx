'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { Pin, Rect, SceneObject } from '@/lib/authoring/docs'
import { VIEWPORTS, clampRect, dragRect, snap } from '@/lib/authoring/studio-model'
import type { Corner, ViewportKey } from '@/lib/authoring/studio-model'
import styles from './Studio.module.css'

export type Tool = 'select' | 'draw' | 'wrong' | 'keep'

export interface StageObject {
  object: SceneObject
  index: number
  rect: Rect
}

export interface StagePin {
  /** Number shown on the pin: its place among this scene's notes of that kind. */
  n: number
  /** Index in the feedback file. */
  index: number
  pin: Pin
}

interface Props {
  vp: ViewportKey
  /** The stage page to show. A new value loads behind the current one and replaces it once the game is up. */
  src: string | null
  nativeSrc: string | null
  showNative: boolean
  objects: StageObject[]
  selected: string | null
  tool: Tool
  overlayOn: boolean
  pins: StagePin[]
  /** Text already typed in the note box: a pin click uses it straight away instead of asking. */
  pinNote: string
  /** Controls that sit beside the caption, such as the edit tools. */
  extra?: ReactNode
  onReload: () => void
  onSelect: (id: string | null) => void
  onRect: (index: number, rect: Rect) => void
  onDraw: (rect: Rect) => void
  onPin: (kind: 'wrong' | 'keep', at: { x: number; y: number }, note: string) => void
  onPinClick: (index: number) => void
}

interface Drag {
  mode: 'move' | 'resize' | 'draw'
  index: number
  corner: Corner | null
  origin: { x: number; y: number }
  start: Rect
  rect: Rect
}

interface Frame {
  id: number
  src: string
  ready: boolean
}

const MIN_FRAME = 250
/** What the caption under the frame takes until it has been measured: its gap above, its height and a little slack. */
const CAPTION_H = 54
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se']
const pct = (n: number) => `${n * 100}%`
const place = (r: Rect) => ({ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) })
const handleAt = (c: Corner) => ({ [c.includes('n') ? 'top' : 'bottom']: -8, [c.includes('w') ? 'left' : 'right']: -8, cursor: `${c}-resize` })

export default function PreviewStage(props: Props) {
  const { vp, src, nativeSrc, showNative, objects, selected, tool, overlayOn, pins } = props
  const { w, h } = VIEWPORTS[vp]
  const areaRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState({ w: 360, h: 640 })
  const [drag, setDrag] = useState<Drag | null>(null)
  const [pending, setPending] = useState<{ kind: 'wrong' | 'keep'; at: { x: number; y: number } } | null>(null)
  const [nativeOk, setNativeOk] = useState(false)
  const [which, setWhich] = useState<'web' | 'native'>('web')
  const [frames, setFrames] = useState<Frame[]>([])
  const [slow, setSlow] = useState(false)
  const nextId = useRef(1)

  // The scene gets everything the window leaves: all of its height, less the caption as it really is (it wraps when the edit tools show).
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const measure = () => {
      const caption = captionRef.current
      const room = caption ? caption.offsetHeight + (parseFloat(getComputedStyle(caption).marginTop) || 0) + 4 : CAPTION_H
      setAvail({ w: el.clientWidth, h: Math.max(160, el.clientHeight - room) })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (captionRef.current) observer.observe(captionRef.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => setPending(null), [tool, src, vp])
  // Only show a native frame when a snapshot really exists, so an empty white box never takes the place of the preview.
  useEffect(() => {
    setNativeOk(false)
    if (!nativeSrc) return
    const image = new Image()
    image.onload = () => setNativeOk(true)
    image.src = nativeSrc
  }, [nativeSrc])

  // A new stage page loads behind the one on screen and swaps in once the game inside it is up, so choosing a thing never flashes white.
  useEffect(() => {
    if (!src) { setFrames([]); return }
    setFrames(current => (current.at(-1)?.src === src ? current : [...current.filter(f => f.ready).slice(-1), { id: nextId.current++, src, ready: false }]))
  }, [src])
  // The first load after the dev server restarts compiles the scene, which takes a while. Say so rather than show a blank box.
  useEffect(() => {
    setSlow(false)
    if (!src) return
    const timer = setTimeout(() => setSlow(true), 6000)
    return () => clearTimeout(timer)
  }, [src])
  const live = frames.some(f => f.ready)
  const settle = (id: number, frame: HTMLIFrameElement) => {
    let tries = 0
    const check = () => {
      let up = false
      try { up = frame.contentDocument?.querySelector('[data-stage-ready="true"]') != null } catch { up = true }
      if (up || ++tries > 100) setFrames(current => (current.some(f => f.id === id) ? current.filter(f => f.id >= id).map(f => (f.id === id ? { ...f, ready: true } : f)) : current))
      else setTimeout(check, 100)
    }
    check()
  }

  const hasNative = showNative && vp === 'ph' && nativeOk
  const twoUp = hasNative && avail.w >= MIN_FRAME * 2 + 20
  const scale = Math.max(0.2, Math.min((twoUp ? (avail.w - 20) / 2 : avail.w) / w, avail.h / h, 1))
  const fw = Math.round(w * scale)
  const fh = Math.round(h * scale)
  const showWeb = !hasNative || twoUp || which === 'web'

  const norm = (e: { clientX: number; clientY: number }) => {
    const r = overlayRef.current?.getBoundingClientRect()
    if (!r || !r.width) return { x: 0, y: 0 }
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }
  const begin = (e: ReactPointerEvent, mode: Drag['mode'], o: StageObject | null, corner: Corner | null = null) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const origin = norm(e)
    const start = o?.rect ?? { x: origin.x, y: origin.y, w: 0, h: 0 }
    setDrag({ mode, index: o?.index ?? -1, corner, origin, start, rect: start })
    if (o) props.onSelect(o.object.id)
  }
  const move = (e: ReactPointerEvent) => {
    if (!drag) return
    const p = norm(e)
    if (drag.mode === 'draw') setDrag({ ...drag, rect: { x: Math.min(drag.origin.x, p.x), y: Math.min(drag.origin.y, p.y), w: Math.abs(p.x - drag.origin.x), h: Math.abs(p.y - drag.origin.y) } })
    else setDrag({ ...drag, rect: dragRect(drag.start, drag.corner, p.x - drag.origin.x, p.y - drag.origin.y) })
  }
  const end = () => {
    if (!drag) return
    if (drag.mode === 'draw') {
      if (drag.rect.w >= 0.02 && drag.rect.h >= 0.02) props.onDraw(clampRect({ x: snap(drag.rect.x), y: snap(drag.rect.y), w: drag.rect.w, h: drag.rect.h }))
    } else if (JSON.stringify(drag.rect) !== JSON.stringify(drag.start)) props.onRect(drag.index, drag.rect)
    setDrag(null)
  }
  const shown = (o: StageObject): Rect => (drag && drag.mode !== 'draw' && drag.index === o.index ? drag.rect : o.rect)
  const click = (kind: 'wrong' | 'keep', e: { clientX: number; clientY: number }) => {
    const at = norm(e)
    const rounded = { x: snap(at.x), y: snap(at.y) }
    if (props.pinNote.trim()) props.onPin(kind, rounded, props.pinNote.trim())
    else setPending({ kind, at: rounded })
  }

  return (
    <div ref={areaRef} className={styles.stage} data-testid="studio-stage">
      <div className={styles.frames}>
        {showWeb && (
          <div className={styles.device}>
            <div className={styles.frameBox} style={{ width: fw, height: fh }} data-vp={vp} data-testid="studio-frame-box">
              {src ? frames.map(frame => (
                <iframe
                  key={frame.id}
                  title="Web preview"
                  data-testid="studio-web-frame"
                  src={frame.src}
                  onLoad={e => { if (!frame.ready) settle(frame.id, e.currentTarget) }}
                  style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${scale})`, visibility: frame.ready || frames.length === 1 ? 'visible' : 'hidden' }}
                />
              )) : (
                <div className={styles.empty}>This scene has no stage fixture yet, so there is nothing to preview.</div>
              )}
              {src && (
                <div className={styles.boot} data-live={live} data-testid="stage-boot" role="status" aria-hidden={live}>
                  <i className={styles.bootRing} />
                  <span className={styles.bootText}>{slow ? 'Still compiling the scene. The first load after a restart takes 10 to 20 seconds.' : 'Starting the game'}</span>
                </div>
              )}
              <div ref={overlayRef} className={styles.overlay} data-testid="studio-overlay">
                {overlayOn && objects.map(o => {
                  const r = shown(o)
                  const on = selected === o.object.id
                  return (
                    <div key={o.object.id} data-testid={`obj-${o.object.id}`} className={`${styles.box} ${o.object.status === 'proposed' ? styles.boxProposed : ''} ${on ? styles.boxOn : ''}`} style={place(r)}
                      onPointerDown={e => (tool === 'select' ? begin(e, 'move', o) : undefined)} onPointerMove={move} onPointerUp={end}>
                      <span className={styles.boxLabel}>{o.object.label ?? o.object.id}</span>
                      {on && tool === 'select' && CORNERS.map(c => <i key={c} className={styles.handle} style={handleAt(c)} onPointerDown={e => begin(e, 'resize', o, c)} onPointerMove={move} onPointerUp={end} />)}
                    </div>
                  )
                })}
                {drag?.mode === 'draw' && <div className={styles.draft} style={place(drag.rect)} />}
                {pins.map(p => (
                  <button key={`${p.pin.kind}-${p.index}`} type="button" className={`${styles.pin} ${p.pin.kind === 'keep' ? styles.pinKeep : ''} ${p.pin.resolved ? styles.pinResolved : ''}`} style={{ left: pct(p.pin.at?.x ?? 0), top: pct(p.pin.at?.y ?? 0) }} title={p.pin.note} onClick={() => props.onPinClick(p.index)}>{p.n}</button>
                ))}
                {tool === 'draw' && <div className={styles.capture} data-testid="studio-draw-layer" onPointerDown={e => begin(e, 'draw', null)} onPointerMove={move} onPointerUp={end} />}
                {(tool === 'wrong' || tool === 'keep') && <div className={styles.capture} data-testid="studio-pin-layer" onClick={e => click(tool, e)} />}
                {pending && (
                  <div className={styles.pinPop} style={{ left: pct(Math.min(pending.at.x, 0.45)), top: pct(Math.min(pending.at.y, 0.82)) }}>
                    <input autoFocus className={styles.input} data-testid="studio-pin-input" placeholder={pending.kind === 'wrong' ? 'What is wrong here?' : 'What should stay?'}
                      onKeyDown={e => {
                        if (e.key === 'Escape') setPending(null)
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) { props.onPin(pending.kind, pending.at, e.currentTarget.value.trim()); setPending(null) }
                      }} />
                    <span className={styles.muted}>Enter to save · Esc to cancel</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {hasNative && (twoUp || which === 'native') && (
          <div className={styles.device}>
            <div className={styles.frameBox} style={{ width: fw, height: fh }} data-vp={vp}>
              <img src={nativeSrc ?? ''} alt="Native snapshot" data-testid="studio-native-frame" />
            </div>
          </div>
        )}
      </div>
      <div ref={captionRef} className={styles.frameCaption} data-testid="stage-caption">
        <i className={styles.led} data-on={live} title={live ? 'The game is running' : 'The game is starting'} />
        <span>{VIEWPORTS[vp].label} {VIEWPORTS[vp].hint} · {Math.round(scale * 100)}%</span>
        {hasNative && !twoUp && (
          <span className={styles.seg} role="group" aria-label="Platform">
            <button type="button" aria-pressed={which === 'web'} onClick={() => setWhich('web')}>Web</button>
            <button type="button" aria-pressed={which === 'native'} onClick={() => setWhich('native')}>Native</button>
          </span>
        )}
        {hasNative && twoUp && <span>· web beside native</span>}
        <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} style={{ height: 28 }} onClick={props.onReload} data-testid="reload">Reload</button>
        {props.extra}
        {showNative && !hasNative && nativeSrc && <span data-testid="native-note">Native: no snapshot yet. Run scripts/native-shots.sh.</span>}
      </div>
    </div>
  )
}
