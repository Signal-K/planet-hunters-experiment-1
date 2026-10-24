'use client'

import { useState } from 'react'
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
  n: number
  index: number
  pin: Pin
}

interface Props {
  sceneId: string
  runnerId: string
  sceneName: string
  vp: ViewportKey
  stageHref: string | null
  nativeFixture?: string
  webSources: string[]
  nativeSources: string[]
  objects: StageObject[]
  selected: string | null
  tool: Tool
  overlayOn: boolean
  pins: StagePin[]
  pinNote: string
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

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se']
const pct = (n: number) => `${n * 100}%`
const place = (r: Rect) => ({ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) })
const handleAt = (corner: Corner) => ({ [corner.includes('n') ? 'top' : 'bottom']: -8, [corner.includes('w') ? 'left' : 'right']: -8, cursor: `${corner}-resize` })

/**
 * A Unity-style scene workbench. It deliberately renders the authored object graph,
 * not a second embedded web game. Playable web and iOS fixtures are launch targets
 * of this harness, so a scene has one source graph and two explicit adapters.
 */
export default function SceneHarness(props: Props) {
  const { vp, objects, selected, tool, overlayOn, pins } = props
  const { w, h } = VIEWPORTS[vp]
  const [drag, setDrag] = useState<Drag | null>(null)
  const [pending, setPending] = useState<{ kind: 'wrong' | 'keep'; at: { x: number; y: number } } | null>(null)

  const norm = (e: { currentTarget: EventTarget & HTMLElement; clientX: number; clientY: number }) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)) }
  }
  const begin = (e: ReactPointerEvent<HTMLElement>, mode: Drag['mode'], entry: StageObject | null, corner: Corner | null = null) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const origin = norm(e)
    const start = entry?.rect ?? { x: origin.x, y: origin.y, w: 0, h: 0 }
    setDrag({ mode, index: entry?.index ?? -1, corner, origin, start, rect: start })
    if (entry) props.onSelect(entry.object.id)
  }
  const move = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag) return
    const point = norm(e)
    const rect = drag.mode === 'draw'
      ? { x: Math.min(drag.origin.x, point.x), y: Math.min(drag.origin.y, point.y), w: Math.abs(point.x - drag.origin.x), h: Math.abs(point.y - drag.origin.y) }
      : dragRect(drag.start, drag.corner, point.x - drag.origin.x, point.y - drag.origin.y)
    setDrag({ ...drag, rect })
  }
  const end = () => {
    if (!drag) return
    if (drag.mode === 'draw') {
      if (drag.rect.w >= 0.02 && drag.rect.h >= 0.02) props.onDraw(clampRect({ x: snap(drag.rect.x), y: snap(drag.rect.y), w: drag.rect.w, h: drag.rect.h }))
    } else if (JSON.stringify(drag.rect) !== JSON.stringify(drag.start)) props.onRect(drag.index, drag.rect)
    setDrag(null)
  }
  const shown = (entry: StageObject) => drag && drag.mode !== 'draw' && drag.index === entry.index ? drag.rect : entry.rect
  const addPin = (kind: 'wrong' | 'keep', e: ReactPointerEvent<HTMLElement>) => {
    const point = norm(e)
    const at = { x: snap(point.x), y: snap(point.y) }
    if (props.pinNote.trim()) props.onPin(kind, at, props.pinNote.trim())
    else setPending({ kind, at })
  }

  return (
    <div className={styles.stage} data-testid="scene-harness">
      <div className={styles.harnessHeader}>
        <div><span className={styles.harnessEyebrow}>SCENE HARNESS</span><strong>{props.sceneName}</strong><span className={styles.harnessId}>{props.sceneId}</span></div>
        <span>{objects.length} OBJECTS · {w} × {h}</span>
      </div>
      <div className={styles.harnessGrid}>
        <section className={styles.harnessBlueprint} aria-label="Authored scene graph" style={{ aspectRatio: `${w} / ${h}` }} data-vp={vp}>
          <div className={styles.blueprintGrid} aria-hidden="true" />
          <div className={styles.blueprintAxis} aria-hidden="true"><span>0,0</span><span>1,1</span></div>
          {overlayOn && objects.map(entry => {
            const rect = shown(entry)
            const active = selected === entry.object.id
            return (
              <div key={entry.object.id} data-testid={`obj-${entry.object.id}`} className={`${styles.box} ${entry.object.status === 'proposed' ? styles.boxProposed : ''} ${active ? styles.boxOn : ''}`} style={place(rect)}
                onPointerDown={e => tool === 'select' ? begin(e, 'move', entry) : undefined} onPointerMove={move} onPointerUp={end}>
                <span className={styles.boxLabel}>{entry.object.label ?? entry.object.id}</span>
                {active && tool === 'select' && CORNERS.map(corner => <i key={corner} className={styles.handle} style={handleAt(corner)} onPointerDown={e => begin(e, 'resize', entry, corner)} onPointerMove={move} onPointerUp={end} />)}
              </div>
            )
          })}
          {drag?.mode === 'draw' && <div className={styles.draft} style={place(drag.rect)} />}
          {pins.map(pin => <button key={`${pin.pin.kind}-${pin.index}`} type="button" className={`${styles.pin} ${pin.pin.kind === 'keep' ? styles.pinKeep : ''} ${pin.pin.resolved ? styles.pinResolved : ''}`} style={{ left: pct(pin.pin.at?.x ?? 0), top: pct(pin.pin.at?.y ?? 0) }} title={pin.pin.note} onClick={() => props.onPinClick(pin.index)}>{pin.n}</button>)}
          {tool === 'draw' && <div className={styles.capture} data-testid="studio-draw-layer" onPointerDown={e => begin(e, 'draw', null)} onPointerMove={move} onPointerUp={end} />}
          {(tool === 'wrong' || tool === 'keep') && <div className={styles.capture} data-testid="studio-pin-layer" onPointerUp={e => addPin(tool, e)} />}
          {pending && <div className={styles.pinPop} style={{ left: pct(Math.min(pending.at.x, 0.45)), top: pct(Math.min(pending.at.y, 0.82)) }}><input autoFocus className={styles.input} data-testid="studio-pin-input" placeholder={pending.kind === 'wrong' ? 'What is wrong here?' : 'What should stay?'} onKeyDown={e => { if (e.key === 'Escape') setPending(null); if (e.key === 'Enter' && e.currentTarget.value.trim()) { props.onPin(pending.kind, pending.at, e.currentTarget.value.trim()); setPending(null) } }} /><span className={styles.muted}>Enter to save · Esc to cancel</span></div>}
        </section>
        <aside className={styles.harnessContract} aria-label="Build contract">
          <h2>BUILD CONTRACT</h2>
          <p>Author once in <code>shared/authoring</code>. The generated graph is consumed by both game adapters.</p>
          <div className={styles.harnessTarget}><span>WEB</span><strong>{props.stageHref ? 'Independent fixture' : 'No fixture declared'}</strong>{props.stageHref && <a href={props.stageHref}>Run fixture</a>}<small>{props.webSources.length ? props.webSources.join(', ') : 'No web adapter mapped'}</small></div>
          <div className={styles.harnessTarget}><span>IOS</span><strong>{props.nativeFixture ? `SceneCatalog: ${props.nativeFixture}` : 'No iOS fixture declared'}</strong><small>{props.nativeSources.length ? props.nativeSources.join(', ') : 'No iOS adapter mapped'}</small></div>
          <p className={styles.harnessCommand}>node scripts/scene.mjs {props.runnerId} --check</p>
        </aside>
      </div>
      <div className={styles.frameCaption} data-testid="stage-caption"><i className={styles.led} data-on="true" /><span>Blueprint only. Runtime is opened independently through the fixture.</span><button type="button" className={`${styles.btn} ${styles.btnQuiet}`} style={{ height: 28 }} onClick={props.onReload} data-testid="reload">Refresh contract</button>{props.extra}</div>
    </div>
  )
}
